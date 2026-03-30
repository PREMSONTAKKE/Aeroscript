import React, { useState } from 'react';
import { Share2, Download, Instagram, Twitter, Facebook, Link2, X, Check, ExternalLink } from 'lucide-react';
import { shareApi } from '../../services/presetsApi';
import { useAuth } from '../../context/AuthContext';

export default function ShareDialog({ isOpen, onClose, canvasRef, title = 'My Artwork' }) {
  const { user } = useAuth();
  const [shareLinks, setShareLinks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState(null);

  const handleGenerateLinks = async (selectedPlatform = null) => {
    if (!user?.token) return;
    
    const snapshot = canvasRef?.current?.getSnapshot();
    if (!snapshot?.hasContent) return;

    setLoading(true);
    setPlatform(selectedPlatform);
    try {
      const result = await shareApi.generateLinks(user.token, {
        thumbnail: snapshot.thumbnail,
        title,
        platform: selectedPlatform,
      });
      setShareLinks(result.shareLinks);
    } catch (err) {
      console.error('Failed to generate share links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const snapshot = canvasRef?.current?.getSnapshot();
    if (!snapshot?.thumbnail) return;

    const link = document.createElement('a');
    link.href = snapshot.thumbnail;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.click();
  };

  const handleCopyLink = async () => {
    if (!shareLinks?.instagram?.downloadUrl) return;
    
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = (platform) => {
    const links = {
      instagram: () => {
        window.open(shareLinks?.instagram?.url, '_blank');
      },
      twitter: () => {
        window.open(shareLinks?.twitter?.url, '_blank');
      },
      facebook: () => {
        window.open(shareLinks?.facebook?.url, '_blank');
      },
      pinterest: () => {
        window.open(shareLinks?.pinterest?.url, '_blank');
      },
    };

    if (links[platform]) {
      links[platform]();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 p-2">
              <Share2 size={20} className="text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Share Artwork</h2>
              <p className="text-xs text-slate-400">Share your creation with the world</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-slate-800">
                <canvas 
                  ref={(canvas) => {
                    if (canvas && canvasRef?.current?.getSnapshot()?.thumbnail) {
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = 64;
                        canvas.height = 64;
                        ctx.drawImage(img, 0, 0, 64, 64);
                      };
                      img.src = canvasRef.current.getSnapshot().thumbnail;
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">{title}</h3>
                <p className="text-xs text-slate-400">Ready to share</p>
              </div>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Download</h4>
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Download size={20} className="text-cyan-400" />
                <span className="text-white">Download as PNG</span>
              </div>
              <ExternalLink size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Share to Social Media</h4>
            
            <button
              onClick={() => handleShare('instagram')}
              disabled={!shareLinks?.instagram}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-purple-600 to-pink-500 p-4 text-left transition hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Instagram size={20} className="text-white" />
                <span className="font-medium text-white">Instagram</span>
              </div>
              {shareLinks?.instagram ? (
                <ExternalLink size={16} className="text-white/70" />
              ) : (
                <span className="text-xs text-white/70">Generate links</span>
              )}
            </button>

            <button
              onClick={() => handleShare('twitter')}
              disabled={!shareLinks?.twitter}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-left transition hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Twitter size={20} className="text-white" />
                <span className="font-medium text-white">Twitter / X</span>
              </div>
              {shareLinks?.twitter ? (
                <ExternalLink size={16} className="text-white/70" />
              ) : (
                <span className="text-xs text-white/70">Generate links</span>
              )}
            </button>

            <button
              onClick={() => handleShare('facebook')}
              disabled={!shareLinks?.facebook}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-left transition hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Facebook size={20} className="text-white" />
                <span className="font-medium text-white">Facebook</span>
              </div>
              {shareLinks?.facebook ? (
                <ExternalLink size={16} className="text-white/70" />
              ) : (
                <span className="text-xs text-white/70">Generate links</span>
              )}
            </button>

            <button
              onClick={() => handleShare('pinterest')}
              disabled={!shareLinks?.pinterest}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-red-600 to-red-800 p-4 text-left transition hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                </svg>
                <span className="font-medium text-white">Pinterest</span>
              </div>
              {shareLinks?.pinterest ? (
                <ExternalLink size={16} className="text-white/70" />
              ) : (
                <span className="text-xs text-white/70">Generate links</span>
              )}
            </button>
          </div>

          {!shareLinks && (
            <button
              onClick={() => handleGenerateLinks()}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-cyan-500 py-3 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Share Links'}
            </button>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              <Link2 size={14} className="mr-2 inline" />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
