import { NextRequest, NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Türkçe karakterleri dönüştüren fonksiyon
function convertTurkishChars(text: string): string {
  const turkishChars: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  };

  // Önce tüm karakterleri küçük harfe çevir
  let result = text.toLowerCase();
  
  // Türkçe karakterleri dönüştür
  result = result.replace(/[ğüşıöç]/g, letter => turkishChars[letter] || letter);
  
  // Özel karakterleri ve boşlukları düzenle
  result = result
    .replace(/[^a-z0-9\s-]/g, '') // Sadece harfleri, rakamları, boşlukları ve tire işaretini tut
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim() // Baştaki ve sondaki boşlukları kaldır
    .replace(/\s/g, '-'); // Boşlukları tire ile değiştir
  
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    try {
      // Video bilgilerini al
      const { stdout: info } = await execAsync(`yt-dlp --dump-json "${url}"`);
      const videoInfo = JSON.parse(info);
      
      // En yüksek kaliteli thumbnail'i seç
      const thumbnails = videoInfo.thumbnails || [];
      const bestThumbnail = thumbnails.reduce((best: any, current: any) => {
        const currentRes = (current.height || 0) * (current.width || 0);
        const bestRes = (best.height || 0) * (best.width || 0);
        return currentRes > bestRes ? current : best;
      }, thumbnails[0] || { url: videoInfo.thumbnail });

      return NextResponse.json({
        title: videoInfo.title,
        safeTitle: convertTurkishChars(videoInfo.title.replace(/[^\w\s-]/g, '')),
        duration: videoInfo.duration,
        thumbnail: bestThumbnail.url || videoInfo.thumbnail,
        description: videoInfo.description,
      });

    } catch (processError: any) {
      console.error('İşlem hatası:', processError);
      return NextResponse.json(
        { error: 'Video bilgileri alınırken bir hata oluştu: ' + (processError.stderr || processError.message) },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Genel hata:', error);
    return NextResponse.json(
      { 
        error: 'İşlem sırasında bir hata oluştu: ' + error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
} 