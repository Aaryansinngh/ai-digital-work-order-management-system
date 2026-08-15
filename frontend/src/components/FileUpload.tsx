import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxFiles?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ photos, onChange, maxFiles = 4 }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (photos.length >= maxFiles) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onChange([...photos, e.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-300 mb-2">
        Photographic Evidence (Mobile / Field Upload)
      </label>

      {/* Upload Zone */}
      {photos.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment" // Mobile camera trigger
            onChange={(e) => handleFile(e.target.files)}
            className="hidden"
            id="photo-upload-input"
          />
          <label htmlFor="photo-upload-input" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs font-medium text-slate-200">
              Tap to snap or upload field photo ({photos.length}/{maxFiles})
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, WebP</span>
          </label>
        </div>
      )}

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img src={photo} alt={`Evidence ${index + 1}`} className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1.5 right-1.5 p-1 bg-rose-950/90 text-rose-300 border border-rose-800 rounded-full hover:bg-rose-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
