interface DateInfo {
  day: number;
  month: number;
  year: number;
  fullDate: string;
}

interface VersionInfo {
  version: string;
  lastUpdate: DateInfo;
  changeNotes: string;
  downloadUrl: string;
  minorChanges: string[];
}

export async function checkForUpdates(): Promise<{
  hasUpdate: boolean;
  versionInfo?: VersionInfo;
  error?: string;
}> {
  try {
    // Önce local version.json'ı kontrol et
    let localVersion: VersionInfo;
    try {
      const localResponse = await fetch('/version.json');
      if (!localResponse.ok) {
        throw new Error('Lokal versiyon dosyası bulunamadı');
      }
      localVersion = await localResponse.json();
    } catch (error) {
      console.error('Lokal versiyon okuma hatası:', error);
      return {
        hasUpdate: false,
        error: 'Lokal versiyon bilgisi okunamadı'
      };
    }

    // GitHub'dan version.json dosyasını çek
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/metinfarukbiyik/yt-download/main/version.json',
        {
          cache: 'no-store', // Her zaman en güncel veriyi al
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('GitHub\'dan versiyon bilgisi alınamadı');
      }

      const onlineVersion: VersionInfo = await response.json();
      
      // Versiyonları karşılaştır
      const hasUpdate = compareVersions(onlineVersion.version, localVersion.version);

      return {
        hasUpdate,
        versionInfo: hasUpdate ? onlineVersion : undefined
      };
    } catch (error) {
      console.error('Online versiyon kontrol hatası:', error);
      // Online versiyon alınamazsa güncelleme yok say
      return {
        hasUpdate: false,
        error: 'Güncelleme kontrolü yapılamadı'
      };
    }
  } catch (error) {
    console.error('Genel hata:', error);
    return {
      hasUpdate: false,
      error: 'Beklenmeyen bir hata oluştu'
    };
  }
}

// Semantic versioning karşılaştırması (1.0.0 formatı için)
function compareVersions(online: string, local: string): boolean {
  const onlineParts = online.split('.').map(Number);
  const localParts = local.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (onlineParts[i] > localParts[i]) return true;
    if (onlineParts[i] < localParts[i]) return false;
  }

  return false;
} 