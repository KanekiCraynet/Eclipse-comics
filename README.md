# Eclipse - Baca Komik Bahasa Indonesia

Aplikasi web untuk membaca komik bahasa Indonesia secara online.

## 🚀 Tech Stack

- **React 18** - UI Framework
- **Vite 6** - Build Tool
- **React Router DOM** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP Client

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Vercel will automatically detect Vite and configure build settings
4. Deploy!

The project is already configured with:
- ✅ Optimized build settings
- ✅ SPA routing configuration
- ✅ Caching headers for static assets
- ✅ Security headers

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist` folder contains the production build

3. Deploy the `dist` folder to your hosting provider

## ⚙️ Build Optimizations

- **Code Splitting**: Automatic chunk splitting for better caching
- **Asset Optimization**: Images and fonts are optimized and cached
- **Minification**: Production builds are minified with esbuild
- **Tree Shaking**: Unused code is automatically removed

## 📝 Configuration Files

- `vite.config.js` - Vite build configuration
- `vercel.json` - Vercel deployment configuration
- `tailwind.config.js` - Tailwind CSS configuration

## 🔒 Security

- Content Security Policy (CSP) headers
- X-Frame-Options protection
- X-Content-Type-Options protection
- X-XSS-Protection enabled

## 📄 License

Private project
