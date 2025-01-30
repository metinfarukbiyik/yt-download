"use client";

import { useState, useEffect } from "react";
import { checkForUpdates } from "../utils/versionCheck";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedFile, setDownloadedFile] = useState<Blob | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    checkForUpdates().then((result) => {
      if (result.hasUpdate) {
        setUpdateAvailable(true);
        setUpdateInfo(result.versionInfo);
      }
    });
  }, []);

  // YouTube URL'sini düzenleyen yardımcı fonksiyon
  const formatYouTubeUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // YouTube shorts URL'sini normal URL'ye çevir
      if (urlObj.pathname.includes('/shorts/')) {
        return `https://www.youtube.com/watch?v=${urlObj.pathname.split('/shorts/')[1]}`;
      }
      
      // YouTube video ID'sini al
      let videoId = '';
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.substring(1);
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
      
      if (!videoId) {
        throw new Error('Geçersiz YouTube URL\'si');
      }
      
      return `https://www.youtube.com/watch?v=${videoId}`;
    } catch (err) {
      throw new Error('Lütfen geçerli bir YouTube bağlantısı girin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setDownloadReady(false);
    setDownloadProgress(0);
    setDownloadedFile(null);

    try {
      const formattedUrl = formatYouTubeUrl(url);

      // Progress bar simülasyonu
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: formattedUrl }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "İndirme başarısız oldu");
      }

      setDownloadProgress(100);
      const blob = await response.blob();
      setDownloadedFile(blob);
      setDownloadReady(true);

    } catch (err: any) {
      setError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
      console.error("İndirme hatası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadedFile) return;

    const downloadUrl = window.URL.createObjectURL(downloadedFile);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${videoTitle}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setError("");
    setVideoTitle("");
    setVideoThumbnail("");
    setVideoDescription("");
    setDownloadReady(false);
    setDownloadProgress(0);
    setDownloadedFile(null);

    if (newUrl.trim()) {
      try {
        const formattedUrl = formatYouTubeUrl(newUrl);
        const response = await fetch("/api/info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: formattedUrl }),
        });

        if (response.ok) {
          const data = await response.json();
          setVideoTitle(data.title);
          setVideoThumbnail(data.thumbnail);
          setVideoDescription(data.description);
        }
      } catch (err) {
        // URL geçersizse sessizce devam et
      }
    }
  };

  return (
    <>
      {/* Güncelleme Bildirimi */}
      {updateAvailable && updateInfo && (
        <div className="fixed top-4 right-4 max-w-sm z-50">
          <div className="bg-purple-500/20 backdrop-blur-lg border border-purple-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Yeni Güncelleme Mevcut!</h3>
                <p className="text-sm text-gray-300 mb-2">
                  Versiyon {updateInfo.version} - {updateInfo.changeNotes}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  Yayın Tarihi: {updateInfo.lastUpdate.day}/{updateInfo.lastUpdate.month}/{updateInfo.lastUpdate.year}
                </p>
                <div className="flex gap-2">
                  <a
                    href={updateInfo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                  >
                    İndir
                  </a>
                  <button
                    onClick={() => setUpdateAvailable(false)}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animasyonlu Arka Plan */}
      <div className="animated-background min-h-screen">
        <div className="stars">
          {Array.from({ length: 150 }).map((_, i) => {
            // İndeks tabanlı deterministik değerler
            const leftPos = ((i * 73) % 100); // 73 ile çarparak daha rastgele görünen ama deterministik dağılım
            const size = 0.5 + ((i * 17) % 20) / 10; // 0.5 ile 2.5 arasında değerler
            const duration = 5 + ((i * 31) % 10); // 5 ile 15 arasında değerler
            const delay = ((i * 47) % 10); // 0 ile 10 arasında değerler
            
            return (
              <div
                key={i}
                className="star"
                style={{
                  left: `${leftPos}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  '--duration': `${duration}s`,
                  animationDelay: `${delay}s`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
        <div className="pattern-overlay" />

        <main className="relative min-h-screen flex flex-col items-center py-16 px-4 z-10">
          {/* Logo & Header */}
          <div className="w-full max-w-4xl text-center mb-12">
            <div className="flex flex-row items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-5xl font-extrabold tracking-tight heading-gradient mb-2">
                    YouTube MP3 İndirici
                  </h1>
                </div>
                <div className="w-24 h-1 rounded-full bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 mb-4" />
                <p className="text-lg text-gray-300 font-light tracking-wide max-w-2xl">
                  Favori YouTube videolarınızı reklamsız ve local olarak yüksek kalitede indirin
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-4xl glass p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative">
              <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="YouTube bağlantısını yapıştırın"
                  className="modern-input"
            />
            <button
              type="submit"
                  disabled={isLoading || !url.trim() || downloadReady}
                  className={`action-button convert-button ${isLoading ? 'loading' : ''}`}
                >
                  <span className="button-content">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        İşleniyor
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Dönüştür
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Progress Bar */}
              {(isLoading || downloadReady) && (
                <div className="w-full">
                  <div className="w-full h-2.5 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-gray-400 text-center font-medium">
                    {downloadReady ? "Dönüştürme tamamlandı!" : "Dönüştürülüyor..."}
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              {downloadReady && downloadedFile && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="action-button download-button flex-1"
                  >
                    <span className="button-content">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      İndir
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrl("");
                      setDownloadReady(false);
                      setDownloadedFile(null);
                      setVideoTitle("");
                      setVideoThumbnail("");
                      setVideoDescription("");
                      setDownloadProgress(0);
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>Yeni İndirme</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
            </button>
          </div>
              )}
              
              {/* Video Preview */}
              {videoTitle && (
                <div className="preview-card">
                  <div className="flex gap-6 relative z-10">
                    {videoThumbnail && (
                      <div className="preview-thumbnail">
                        <img
                          src={videoThumbnail}
                          alt={videoTitle}
                          className="w-32 h-32 object-cover rounded-xl shadow-lg transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    )}
                    <div className="flex-grow flex flex-col justify-center overflow-hidden">
                      <h3 className="preview-title">
                        {videoTitle}
                      </h3>
                      {videoDescription && (
                        <p className="preview-description">
                          {videoDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

          {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
          )}
        </form>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Hızlı İndirme</h3>
                  <p className="feature-description">Saniyeler içinde yüksek hızda müzik indirme</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Yüksek Kalite</h3>
                  <p className="feature-description">320kbps kalitesinde MP3 formatında indirin</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Tamamen Ücretsiz</h3>
                  <p className="feature-description">Sınırsız indirme, reklamsız deneyim</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">MP3 İndirme</h3>
                  <p className="feature-description">Müzikleri MP3 formatında indirin</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">MP4 İndirme</h3>
                  <p className="feature-description">Videoları MP4 formatında indirin</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Format Seçenekleri</h3>
                  <p className="feature-description">Farklı kalite ve format seçenekleri</p>
                </div>
              </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto py-8 mt-8">
        <div className="text-center text-sm text-gray-400/80 flex items-center justify-center gap-2 hover:text-gray-400/90 transition-colors duration-300">
          Bu proje{" "}
          <a 
            href="https://biyik.dev" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 font-medium hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all duration-300 border-b border-dashed border-purple-400/30 hover:border-purple-500/50 group"
          >
            Metin Faruk Bıyık
            <svg 
              className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: '#8b5cf6' }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
              />
            </svg>
          </a>
          {" "}tarafından oluşturulmuştur.
        </div>
      </footer>
    </main>
      </div>
    </>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="modern-card group">
      <div className="relative z-10">
        <div className="feature-icon">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
      </div>
    </div>
  );
}
