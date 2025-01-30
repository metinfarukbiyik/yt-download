FROM node:18-slim

# Python ve diğer gereksinimleri kur
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp kur
RUN pip3 install yt-dlp

# Çalışma dizinini ayarla
WORKDIR /app

# Environment variable'ları ayarla
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
ENV NODE_ENV=production

# Bağımlılıkları kopyala ve kur
COPY package*.json ./
RUN npm ci

# Uygulama dosyalarını kopyala
COPY . .

# Uygulamayı derle
RUN npm run build

# Portu aç
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"] 