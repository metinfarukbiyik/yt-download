import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { url } = await req.json();

    // YouTube API'sine istek gönder
    const response = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${getVideoId(url)}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY || '',
        'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
      }
    });

    const data = await response.json();

    if (data.status === 'ok') {
      return NextResponse.json({ downloadUrl: data.link });
    } else {
      return NextResponse.json(
        { error: 'Video dönüştürme başarısız oldu.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
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

// YouTube video ID'sini URL'den ayıkla
function getVideoId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : '';
}