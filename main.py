import cv2
import mediapipe as mp
from mediapipe.python.solutions import hands as mp_hands
from mediapipe.python.solutions import drawing_utils
from flask import Flask, request
from flask_socketio import SocketIO
from flask_cors import CORS
import os
import time
import threading

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize MediaPipe Hands directly
hand_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    model_complexity=1
)

# Get hand connections
HAND_CONNECTIONS = mp_hands.HAND_CONNECTIONS

# Global camera object (initialized in processing_loop)
cap = None

def init_camera():
    """Initialize camera with retry logic"""
    global cap
    max_retries = 5
    for attempt in range(max_retries):
        try:
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer for faster frame capture
            
            # Test if camera is accessible
            ret, test_frame = cap.read()
            if ret and test_frame is not None:
                print(f"✅ Camera initialized successfully")
                print(f"   Resolution: {cap.get(cv2.CAP_PROP_FRAME_WIDTH):.0f}x{cap.get(cv2.CAP_PROP_FRAME_HEIGHT):.0f}")
                print(f"   FPS: {cap.get(cv2.CAP_PROP_FPS):.0f}")
                return True
            else:
                cap.release()
                raise Exception("Camera opened but cannot read frames")
        except Exception as e:
            print(f"❌ Camera initialization attempt {attempt + 1}/{max_retries} failed: {str(e)}")
            if cap is not None:
                cap.release()
            time.sleep(1)
    
    print("❌ Failed to initialize camera after all retries")
    return False

def processing_loop():
    global cap
    hand_was_visible = False
    smooth_x, smooth_y = 0, 0
    EMA_ALPHA = 0.35
    smoothed_landmarks = [{"x": 0, "y": 0} for _ in range(21)]
    frame_count = 0
    camera_failed_attempts = 0

    # Initialize camera once at start
    if not init_camera():
        print("Cannot start processing loop without camera")
        return
    
    while True:
        try:
            if cap is None or not cap.isOpened():
                print("Camera disconnected, attempting to reinitialize...")
                if not init_camera():
                    camera_failed_attempts += 1
                    if camera_failed_attempts > 3:
                        print("Camera recovery failed, pausing for 5 seconds...")
                        time.sleep(5)
                    continue
                camera_failed_attempts = 0
            
            success, frame = cap.read()
            if not success or frame is None:
                camera_failed_attempts += 1
                if camera_failed_attempts % 30 == 0:  # Log every 30 failed attempts
                    print(f"⚠️  Warning: Failed to read frame (attempt {camera_failed_attempts})")
                if camera_failed_attempts > 100:
                    print("Too many frame read failures, reinitializing camera...")
                    if cap is not None:
                        cap.release()
                    cap = None
                    camera_failed_attempts = 0
                time.sleep(0.05)
                continue
            
            camera_failed_attempts = 0
            frame_count += 1
            
            # Log camera status periodically
            if frame_count % 300 == 0:
                print(f"✅ Processing frame {frame_count}... Camera active")
            
            start_time = time.time()
            frame = cv2.flip(frame, 1)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Improve frame quality for better detection
            frame_rgb = cv2.GaussianBlur(frame_rgb, (5, 5), 0)
            
            # Normalize brightness
            brightness_value = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2HSV)[:, :, 2].mean()
            if brightness_value < 50:
                frame_rgb = cv2.convertScaleAbs(frame_rgb, alpha=1.5, beta=50)
            
            # Process the frame
            results = hand_detector.process(frame_rgb)
            
            data = {
                "isDrawing": False,
                "x": 0,
                "y": 0,
                "isVisible": False,
                "landmarks": [],
                "fingersCount": 0
            }

            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Draw hand landmarks on frame
                    drawing_utils.draw_landmarks(
                        frame, 
                        hand_landmarks, 
                        HAND_CONNECTIONS
                    )
                    
                    # Get index finger tip (landmark 8)
                    lm8 = hand_landmarks.landmark[8]
                    raw_x, raw_y = lm8.x * 100, lm8.y * 100
                    
                    # Reset EMA if hand just became visible
                    if not hand_was_visible:
                        smooth_x, smooth_y = raw_x, raw_y
                        for i, lm in enumerate(hand_landmarks.landmark):
                            smoothed_landmarks[i] = {"x": lm.x * 100, "y": lm.y * 100}
                        hand_was_visible = True
                    
                    # Apply EMA smoothing
                    smooth_x = EMA_ALPHA * raw_x + (1 - EMA_ALPHA) * smooth_x
                    smooth_y = EMA_ALPHA * raw_y + (1 - EMA_ALPHA) * smooth_y
                    ix, iy = round(smooth_x, 2), round(smooth_y, 2)
                    
                    # Gesture detection (drawing logic)
                    dist_v = hand_landmarks.landmark[5].y - hand_landmarks.landmark[8].y
                    
                    is_index_up = dist_v > 0.05
                    is_middle_up = hand_landmarks.landmark[12].y < hand_landmarks.landmark[9].y
                    is_ring_up = hand_landmarks.landmark[16].y < hand_landmarks.landmark[13].y
                    is_pinky_up = hand_landmarks.landmark[20].y < hand_landmarks.landmark[17].y
                    
                    is_drawing = False
                    if is_index_up and not is_middle_up and not is_ring_up and not is_pinky_up:
                        is_drawing = True
                    
                    # Finger counting
                    fingers_up = 0
                    if hand_landmarks.landmark[8].y < hand_landmarks.landmark[6].y: 
                        fingers_up += 1
                    if hand_landmarks.landmark[12].y < hand_landmarks.landmark[10].y: 
                        fingers_up += 1
                    if hand_landmarks.landmark[16].y < hand_landmarks.landmark[14].y: 
                        fingers_up += 1
                    if hand_landmarks.landmark[20].y < hand_landmarks.landmark[18].y: 
                        fingers_up += 1
                    
                    # Process all landmarks
                    final_landmarks = []
                    for i, lm in enumerate(hand_landmarks.landmark):
                        if i == 8:
                            final_landmarks.append({"x": ix, "y": iy})
                        else:
                            lx, ly = lm.x * 100, lm.y * 100
                            smoothed_landmarks[i]["x"] = EMA_ALPHA * lx + (1 - EMA_ALPHA) * smoothed_landmarks[i]["x"]
                            smoothed_landmarks[i]["y"] = EMA_ALPHA * ly + (1 - EMA_ALPHA) * smoothed_landmarks[i]["y"]
                            final_landmarks.append({
                                "x": round(smoothed_landmarks[i]["x"], 2),
                                "y": round(smoothed_landmarks[i]["y"], 2)
                            })
                    
                    data = {
                        "isDrawing": is_drawing,
                        "x": ix,
                        "y": iy,
                        "isVisible": True,
                        "landmarks": final_landmarks,
                        "fingersCount": fingers_up
                    }
            else:
                hand_was_visible = False
                data["isVisible"] = False
            
            # Send data over websocket
            socketio.emit('hand_data', data)
            
            # Maintain frame rate
            elapsed = time.time() - start_time
            time.sleep(max(0, (1.0 / 30.0) - elapsed))  # Target 30 FPS
            
        except Exception as e:
            print(f"Error in processing loop: {str(e)}")
            import traceback
            traceback.print_exc()
            time.sleep(0.1)
        except Exception as e:
            print(f"Error in processing loop: {str(e)}")
            import traceback
            traceback.print_exc()
            time.sleep(0.1)

@app.route('/')
def hello():
    return "Aeroscript Backend is Running!"

@socketio.on('connect')
def handle_connect():
    print(f"Client connected (SID: {request.sid})")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected (SID: {request.sid})")

@socketio.on_error()
def handle_error(e):
    print(f"WebSocket error occurred: {str(e)}")
    import traceback
    traceback.print_exc()

def check_server():
    import requests
    try:
        response = requests.get('http://localhost:5001/')
        print(f"Server check: {response.status_code} - {response.text.strip()}")
        return True
    except Exception as e:
        print(f"Server not available: {str(e)}")
        return False

if __name__ == '__main__':
    print("Starting Aeroscript Hand Tracking Server...")
    print("Initializing camera and processing loop...")
    
    bg_thread = threading.Thread(target=processing_loop, daemon=True)
    bg_thread.start()
    
    # Give the thread time to initialize
    time.sleep(2)
    
    print("Server is starting on http://0.0.0.0:5001")
    try:
        socketio.run(app, host='0.0.0.0', port=5001, debug=False, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        if cap is not None:
            cap.release()
        print("Server stopped")