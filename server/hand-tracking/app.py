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

try:
    import cv2
    import mediapipe as mp
    from mediapipe.python.solutions import hands as mp_hands
    from mediapipe.python.solutions import drawing_utils
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False

HAND_CONNECTIONS = mp_hands.HAND_CONNECTIONS if HAS_MEDIAPIPE else ()

cap = None
hand_detector = None

def init_camera():
    global cap, hand_detector
    if not HAS_MEDIAPIPE:
        print("MediaPipe not available")
        return False
    try:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        ret, test_frame = cap.read()
        if ret and test_frame is not None:
            hand_detector = mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.7,
                model_complexity=1
            )
            print("Camera initialized successfully")
            return True
        else:
            cap.release()
            return False
    except Exception as e:
        print(f"Camera init failed: {e}")
        return False

def processing_loop():
    global cap, hand_detector
    if not HAS_MEDIAPIPE:
        print("Hand tracking unavailable - MediaPipe not installed")
        return
    
    hand_was_visible = False
    smooth_x, smooth_y = 0, 0
    EMA_ALPHA = 0.35
    smoothed_landmarks = [{"x": 0, "y": 0} for _ in range(21)]

    if not init_camera():
        print("Cannot start processing loop without camera")
        return
    
    while True:
        try:
            if cap is None or not cap.isOpened():
                time.sleep(0.1)
                continue
            
            success, frame = cap.read()
            if not success or frame is None:
                time.sleep(0.05)
                continue
            
            frame = cv2.flip(frame, 1)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_rgb = cv2.GaussianBlur(frame_rgb, (5, 5), 0)
            
            brightness_value = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2HSV)[:, :, 2].mean()
            if brightness_value < 50:
                frame_rgb = cv2.convertScaleAbs(frame_rgb, alpha=1.5, beta=50)
            
            if hand_detector is None:
                time.sleep(0.1)
                continue
                
            results = hand_detector.process(frame_rgb)
            
            data = {
                "isDrawing": False,
                "x": 0, "y": 0,
                "isVisible": False,
                "landmarks": [],
                "fingersCount": 0
            }

            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    lm8 = hand_landmarks.landmark[8]
                    raw_x, raw_y = lm8.x * 100, lm8.y * 100
                    
                    if not hand_was_visible:
                        smooth_x, smooth_y = raw_x, raw_y
                        for i, lm in enumerate(hand_landmarks.landmark):
                            smoothed_landmarks[i] = {"x": lm.x * 100, "y": lm.y * 100}
                        hand_was_visible = True
                    
                    smooth_x = EMA_ALPHA * raw_x + (1 - EMA_ALPHA) * smooth_x
                    smooth_y = EMA_ALPHA * raw_y + (1 - EMA_ALPHA) * smooth_y
                    ix, iy = round(smooth_x, 2), round(smooth_y, 2)
                    
                    dist_v = hand_landmarks.landmark[5].y - hand_landmarks.landmark[8].y
                    is_index_up = dist_v > 0.05
                    is_middle_up = hand_landmarks.landmark[12].y < hand_landmarks.landmark[9].y
                    is_ring_up = hand_landmarks.landmark[16].y < hand_landmarks.landmark[13].y
                    is_pinky_up = hand_landmarks.landmark[20].y < hand_landmarks.landmark[17].y
                    is_drawing = is_index_up and not is_middle_up and not is_ring_up and not is_pinky_up
                    
                    fingers_up = 0
                    if hand_landmarks.landmark[8].y < hand_landmarks.landmark[6].y: fingers_up += 1
                    if hand_landmarks.landmark[12].y < hand_landmarks.landmark[10].y: fingers_up += 1
                    if hand_landmarks.landmark[16].y < hand_landmarks.landmark[14].y: fingers_up += 1
                    if hand_landmarks.landmark[20].y < hand_landmarks.landmark[18].y: fingers_up += 1
                    
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
                        "x": ix, "y": iy,
                        "isVisible": True,
                        "landmarks": final_landmarks,
                        "fingersCount": fingers_up
                    }
            else:
                hand_was_visible = False
                data["isVisible"] = False
            
            socketio.emit('hand_data', data)
            time.sleep(1.0 / 30.0)
            
        except Exception as e:
            print(f"Processing error: {e}")
            time.sleep(0.1)

@app.route('/')
def hello():
    return "Aeroscript Hand Tracking Server Running!"

@app.route('/health')
def health():
    return {"status": "ok", "has_mediapipe": HAS_MEDIAPIPE}

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

if __name__ == '__main__':
    print("Starting Aeroscript Hand Tracking Server...")
    if HAS_MEDIAPIPE:
        print("MediaPipe available - starting hand tracking")
        bg_thread = threading.Thread(target=processing_loop, daemon=True)
        bg_thread.start()
    else:
        print("WARNING: MediaPipe not installed - hand tracking disabled")
        print("Install with: pip install opencv-python mediapipe")
    
    port = int(os.environ.get('PORT', 5001))
    print(f"Server running on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
