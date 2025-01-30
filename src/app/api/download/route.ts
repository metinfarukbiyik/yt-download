import { NextRequest, NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Türkçe karakterleri dönüştüren ve dosya adını formatlayan fonksiyon
function formatFileName(text: string): string {
  const turkishChars: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  };

  // Türkçe karakterleri dönüştür
  let result = text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, letter => turkishChars[letter] || letter);
  
  // Dosya sistemi için uyumsuz karakterleri temizle
  result = result
    .replace(/[<>:"/\\|?*]/g, '') // Dosya sistemi için uyumsuz karakterleri kaldır
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim(); // Baştaki ve sondaki boşlukları kaldır
  
  return result;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 dakika timeout

export async function POST(req: NextRequest): Promise<Response> {
  let tempFile: string | null = null;

  try {
    const { url } = await req.json();

    // Video bilgilerini al
    const { stdout: info } = await execAsync(`yt-dlp --dump-json "${url}"`);
    const videoInfo = JSON.parse(info);
    const safeTitle = formatFileName(videoInfo.title);
    
    // Geçici dosya adı oluştur
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    tempFile = path.join(tempDir, `youtube-${timestamp}.mp3`);

    console.log('Video indiriliyor...');
    
    // Videoyu indir ve ses formatına dönüştür
    await execAsync(
      `yt-dlp --extract-audio --audio-format mp3 --audio-quality 0 ` +
      `--no-check-certificates --no-warnings --prefer-free-formats ` +
      `--add-header "referer:youtube.com" ` +
      `--add-header "user-agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" ` +
      `--force-overwrites --no-keep-video --embed-metadata ` +
      `--postprocessor-args "-ar 44100" ` +
      `-o "${tempFile}" "${url}"`
    );
    
    // Dosyayı oku
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const fileStream = createReadStream(tempFile!);
      
      fileStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      fileStream.on('end', () => resolve(Buffer.concat(chunks)));
      fileStream.on('error', reject);
    });

    // Geçici dosyayı sil
    try {
      await unlink(tempFile);
    } catch (err) {
      console.error('Geçici dosya silinirken hata:', err);
    }

    // Response oluştur
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    return new NextResponse(fileBuffer, { headers });

  } catch (error: any) {
    // Hata durumunda geçici dosyayı temizle
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (err) {
        console.error('Geçici dosya silinirken hata:', err);
      }
    }

    console.error('Hata:', error);
    return NextResponse.json(
      { 
        error: 'İndirme sırasında bir hata oluştu: ' + error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}