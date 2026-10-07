import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Trash2, Upload, AlertCircle } from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  onSave,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#112952'); // Royal Navy matching Top Store
  const [lineWidth, setLineWidth] = useState(3);
  const [currentSignature, setCurrentSignature] = useState<string | undefined>(initialSignature);
  const [isEditing, setIsEditing] = useState(!initialSignature);

  // Sync initialSignature if changed externally
  useEffect(() => {
    setCurrentSignature(initialSignature);
    if (!initialSignature) {
      setIsEditing(true);
    }
  }, [initialSignature]);

  // Canvas setup and redraw
  useEffect(() => {
    if (!isEditing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    // Clear transparent background
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, [isEditing, strokeColor, lineWidth]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      // Prevent scrolling while drawing on touch devices
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasDrawn) {
      alert('يرجى رسم التوقيع أولاً في المساحة المخصصة قبل الحفظ.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    setCurrentSignature(dataUrl);
    setIsEditing(false);
    onSave(dataUrl);
  };

  const handleDeleteSavedSignature = () => {
    if (window.confirm('هل أنت متأكد من حذف التوقيع المعتمد؟ سيتم إزالته من الفواتير وكشوف الحسابات.')) {
      setCurrentSignature(undefined);
      setIsEditing(true);
      setHasDrawn(false);
      onClear?.();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG أو JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentSignature(dataUrl);
        setIsEditing(false);
        onSave(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* If signature exists and NOT editing, show preview */}
      {currentSignature && !isEditing ? (
        <div className="bg-slate-50 border-2 border-dashed border-[#112952]/30 rounded-2xl p-5 flex flex-col items-center justify-center relative group">
          <div className="flex items-center gap-2 mb-2 text-[#112952]">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold">التوقيع المالي المعتمد والمطبق حالياً</span>
          </div>

          {/* Signature Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-center min-h-[90px] w-full max-w-sm">
            <img
              src={currentSignature}
              alt="التوقيع المعتمد"
              className="max-h-20 max-w-full object-contain"
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-2 text-center">
            يتم إدراج هذا التوقيع تلقائياً في خانة الاعتماد بجميع الفواتير، سندات القبض، وكشوفات الحساب.
          </p>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setHasDrawn(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#112952] hover:bg-[#183668] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>إعادة رسم التوقيع</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSavedSignature}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف التوقيع</span>
            </button>
          </div>
        </div>
      ) : (
        /* Interactive Drawing Pad */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <PenTool className="w-4 h-4 text-[#112952]" />
              <span>ارسم توقيعك المالي المعتمد أدناه (بالماوس أو باللمس على الشاشة):</span>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">اللون:</span>
              <button
                type="button"
                onClick={() => setStrokeColor('#112952')}
                className={`w-5 h-5 rounded-full bg-[#112952] border-2 cursor-pointer transition-transform ${
                  strokeColor === '#112952' ? 'scale-125 border-amber-400 shadow-xs' : 'border-transparent'
                }`}
                title="كحلي ملكي رسمي"
              />
              <button
                type="button"
                onClick={() => setStrokeColor('#0f172a')}
                className={`w-5 h-5 rounded-full bg-slate-900 border-2 cursor-pointer transition-transform ${
                  strokeColor === '#0f172a' ? 'scale-125 border-amber-400 shadow-xs' : 'border-transparent'
                }`}
                title="أسود داكن"
              />
              <button
                type="button"
                onClick={() => setStrokeColor('#1d4ed8')}
                className={`w-5 h-5 rounded-full bg-blue-700 border-2 cursor-pointer transition-transform ${
                  strokeColor === '#1d4ed8' ? 'scale-125 border-amber-400 shadow-xs' : 'border-transparent'
                }`}
                title="أزرق حبري"
              />
            </div>
          </div>

          {/* Canvas Box */}
          <div className="relative border-2 border-dashed border-[#112952]/40 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-36 sm:h-44 block cursor-crosshair"
            />

            {/* Guide watermark in canvas */}
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
                <PenTool className="w-8 h-8 mb-1 opacity-40" />
                <span className="text-xs font-semibold">وقّع هنا بخط يدك</span>
                <span className="text-[10px] text-slate-400 mt-0.5">يدعم اللمس على شاشات الجوال والتابلت وقلم الرسم</span>
              </div>
            )}

            {/* Bottom guide line */}
            <div className="absolute bottom-6 right-10 left-10 border-b border-dashed border-slate-200 pointer-events-none" />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح وإعادة الرسم</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>أو رفع صورة توقيع</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {currentSignature && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer px-2"
                >
                  إلغاء والتراجع
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveSignature}
              disabled={!hasDrawn}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                hasDrawn
                  ? 'bg-[#112952] hover:bg-[#183668] text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>اعتماد وحفظ التوقيع</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
