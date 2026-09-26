"use client";

import React, { useState } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";

export function PredictPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ class?: string; confidence?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to connect to the prediction API.");
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
      <div className="max-w-2xl w-full text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          EuroSAT Classification
        </h2>
        <p className="text-sm text-gray-400">
          Upload a satellite image to classify it using our custom PyTorch ResNet18 model.
        </p>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-xl p-8 shadow-2xl w-full max-w-2xl">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-10 bg-[#1a1a1a] hover:border-blue-500 transition-colors">
          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img src={previewUrl} alt="Preview" className="w-48 h-48 object-cover rounded-lg shadow-lg mb-6" />
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); }}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center cursor-pointer">
              <Upload size={36} className="text-gray-500 mb-4" />
              <span className="text-base font-medium text-gray-300 mb-1">Click to Upload Image</span>
              <span className="text-xs text-gray-500">Supports JPG, PNG</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`flex items-center px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              !file ? "bg-gray-800 text-gray-500 cursor-not-allowed" : 
              loading ? "bg-blue-600 text-white opacity-70" : 
              "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            }`}
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2" size={16} /> Analyzing...</>
            ) : (
              <><ImageIcon className="mr-2" size={16} /> Run Prediction</>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-8 p-5 rounded-lg border border-gray-700 bg-black/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-200">Analysis Result</h3>
            
            {result.error ? (
              <div className="text-red-400 flex items-center bg-red-950/30 p-3 rounded-md text-sm">
                <span className="font-medium">{result.error}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151515] p-3 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Detected Class</div>
                  <div className="text-xl font-bold text-emerald-400">{result.class}</div>
                </div>
                <div className="bg-[#151515] p-3 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Confidence Score</div>
                  <div className="text-xl font-bold text-blue-400">{result.confidence}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
