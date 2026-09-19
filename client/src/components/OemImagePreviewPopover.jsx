import React, { useState, useRef, useEffect } from 'react';
import { ApiService } from '../services/api';
import {
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Maximize2,
  X,
  Sparkles,
  Camera
} from 'lucide-react';

// Bellek içi görsel önbelleği (aynı oturumda aynı koda tekrar hover yapıldığında anında gösterir)
const memoryImageCache = new Map();

/**
 * OemImagePreviewPopover Component
 * 
 * Herhangi bir OEM referans numarasının üstüne gelindiğinde (Hover)
 * ürüne ait fotoğrafları (Google/Web görselleri) açılır kart olarak gösterir.
 */
export function OemImagePreviewPopover({ brand, oem, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [activeModalImage, setActiveModalImage] = useState(null);

  const hoverTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const cacheKey = `${brand}_${oem}`.toUpperCase();

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(async () => {
      setIsOpen(true);
      const defaultGUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
        `${brand} ${oem} filter`.trim()
      )}`;
      setGoogleUrl(defaultGUrl);

      // Bellekte varsa anında göster
      if (memoryImageCache.has(cacheKey)) {
        const cached = memoryImageCache.get(cacheKey);
        setImages(cached.images || []);
        if (cached.googleSearchUrl) setGoogleUrl(cached.googleSearchUrl);
        return;
      }

      // Yoksa API'den çek
      setLoading(true);
      try {
        const res = await ApiService.fetchOemImages(brand, oem);
        memoryImageCache.set(cacheKey, res);
        setImages(res.images || []);
        if (res.googleSearchUrl) setGoogleUrl(res.googleSearchUrl);
      } catch (err) {
        console.error('Hover image error:', err);
      } finally {
        setLoading(false);
      }
    }, 250); // 250ms hover toleransı
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-block ${className}`}
    >
      {/* Tetikleyici Eleman (OEM Rozeti / Butonu) */}
      {children}

      {/* Floating Hover Popover Kartı */}
      {isOpen && (
        <div
          ref={popoverRef}
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-200"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))' }}
        >
          {/* Popover Üst Başlık */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Camera className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="font-extrabold text-xs text-slate-900 truncate">
                {brand} <span className="font-mono text-blue-600">{oem}</span>
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Ürün Görselleri
            </span>
          </div>

          {/* Görsel Izgarası / Yükleniyor Durumu */}
          <div className="min-h-[110px] flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-[11px] font-medium">Görseller yükleniyor...</span>
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {images.slice(0, 3).map((img, iIdx) => (
                  <div
                    key={iIdx}
                    onClick={() => setActiveModalImage(img.image || img.thumbnail)}
                    className="relative group/img aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer hover:border-blue-400 transition-all shadow-2xs"
                    title={img.title}
                  >
                    <img
                      src={img.thumbnail || img.image}
                      alt={img.title || oem}
                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 space-y-1">
                <ImageIcon className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-[11px]">Önizleme görseli bulunamadı.</p>
              </div>
            )}
          </div>

          {/* Alt Buton: Google Görsellerde Aç */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors text-center shadow-2xs"
            >
              <span>Google Görsellerde İncele</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Küçük Aşağı Ok (Pointer Arrow) */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
        </div>
      )}

      {/* Büyük Görsel Büyütme Modalı (Lightbox) */}
      {activeModalImage && (
        <div
          onClick={() => setActiveModalImage(null)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
          >
            <button
              onClick={() => setActiveModalImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeModalImage}
              alt={oem}
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
            />
            <div className="p-3 text-center">
              <span className="font-extrabold text-sm text-slate-900">
                {brand} - {oem}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
