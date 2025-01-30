FROM node:18

# Python ve diğer gereksinimleri kur
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Environment variable'ları ayarla
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
ENV NODE_ENV=production
ENV PATH /app/node_modules/.bin:$PATH

# Önce package.json ve package-lock.json'ı kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Geri kalan dosyaları kopyala
COPY . .

# Uygulamayı derle
RUN npm run build

# Portu aç
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"] 