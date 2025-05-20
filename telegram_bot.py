import os
import subprocess
from urllib.parse import urlparse
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes
import yt_dlp

# Bot token from @BotFather
import os
BOT_TOKEN = os.environ.get("BOT_TOKEN")
TELEGRAM_MAX_SIZE = 2000000000  # 2 GB in bytes

# List of supported domains
allowed_domains = [
    "youtube.com", "youtu.be",
    "tiktok.com",
    "instagram.com",
    "x.com", "twitter.com",
    "nypost.com",
    "abcnews.go.com", "abc7ny.com", "wabc.com", "abc13.com", "abc30.com",
    "cbsnews.com", "newyork.cbslocal.com",
    "nbcnews.com", "nbcnewyork.com", "nbc4i.com",
    "foxnews.com", "fox5ny.com", "foxla.com", "fox29.com", "fox13now.com",
    "cnn.com", "msnbc.com",
    "dailymail.co.uk", "news.yahoo.com", "thehill.com", "bloomberg.com",
    "reuters.com", "apnews.com", "usatoday.com"
]

async def handle_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()
    parsed_url = urlparse(url).netloc.lower()

    if not url.startswith("http"):
        await update.message.reply_text("Please send a valid link.")
        return

    if not any(domain in parsed_url for domain in allowed_domains):
        await update.message.reply_text("This site isn't officially supported, but I'll try downloading anyway.")

    await update.message.reply_text(f"Gaming video: {url}\nDownloading...")

    ydl_opts = {
        'outtmpl': 'downloaded.%(ext)s',
        'format': 'mp4',
        'merge_output_format': 'mp4',
        'quiet': True,
        'max_filesize': 4000000000,  # Let yt-dlp download larger videos; we'll compress if needed
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
    }

    if 'x.com' in parsed_url or 'twitter.com' in parsed_url:
        ydl_opts['cookiefile'] = 'x_cookies.txt'
    elif 'youtube.com' in parsed_url or 'youtu.be' in parsed_url:
        ydl_opts['cookiefile'] = 'youtube_cookies.txt'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            mp4_file = filename if filename.endswith('.mp4') else filename.replace('.webm', '.mp4')

        # Compress if over Telegram's limit
        if os.path.getsize(mp4_file) > TELEGRAM_MAX_SIZE:
            await update.message.reply_text("Video is too large. Compressing...")

            compressed_file = "compressed_" + os.path.basename(mp4_file)

            subprocess.run([
                "ffmpeg", "-i", mp4_file,
                "-vf", "scale=-2:720",
                "-b:v", "1M",
                "-preset", "fast",
                "-c:a", "aac",
                "-b:a", "128k",
                compressed_file
            ], check=True)

            os.remove(mp4_file)
            mp4_file = compressed_file

        # Send video
        with open(mp4_file, 'rb') as video:
            await update.message.reply_video(video=video)

        os.remove(mp4_file)

    except yt_dlp.utils.DownloadError as e:
        await update.message.reply_text("❌ Could not download the video. It may be DRM-protected or unsupported.\n\n" + str(e))
    except Exception as e:
        await update.message.reply_text("❌ An unexpected error occurred:\n" + str(e))


# Run the bot
app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_link))
print("Bot is running...")
app.run_polling()
