"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { API_BASE_URL, API_CONFIGURATION_MESSAGE, apiUrl } from "../../lib/api";

export default function PredictPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ class?: string; confidence?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null); // reset previous results
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!API_BASE_URL) {
      setResult({ error: API_CONFIGURATION_MESSAGE });
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(apiUrl("/predict"), {
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
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <Link href="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          EuroSAT Custom AI Model
        </h1>
        <p className="text-gray-400 mb-8">
          Upload a satellite image to classify it using the custom ResNet18 model we just trained. 
          Make sure the Python API is running in the background.
        </p>

        <div className="bg-[#111] border border-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-12 bg-[#1a1a1a] hover:border-blue-500 transition-colors">
            {previewUrl ? (
              <div className="flex flex-col items-center">
                <img src={previewUrl} alt="Preview" className="w-64 h-64 object-cover rounded-lg shadow-lg mb-6" />
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); }}
                  className="text-sm text-gray-400 hover:text-red-400"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer">
                <Upload size={48} className="text-gray-500 mb-4" />
                <span className="text-lg font-medium text-gray-300 mb-2">Click to Upload Image</span>
                <span className="text-sm text-gray-500">Supports JPG, PNG</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`flex items-center px-8 py-3 rounded-lg font-medium text-lg transition-all ${
                !file ? "bg-gray-800 text-gray-500 cursor-not-allowed" : 
                loading ? "bg-blue-600 text-white opacity-70" : 
                "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
              }`}
            >
              {loading ? (
                <><Loader2 className="animate-spin mr-3" size={20} /> Analyzing...</>
              ) : (
                <><ImageIcon className="mr-3" size={20} /> Run Prediction</>
              )}
            </button>
          </div>

          {result && (
            <div className="mt-8 p-6 rounded-lg border border-gray-700 bg-black/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Analysis Result</h3>
              
              {result.error ? (
                <div className="text-red-400 flex items-center bg-red-950/30 p-4 rounded-md">
                  <span className="font-medium">{result.error}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#151515] p-4 rounded-md border border-gray-800">
                    <div className="text-sm text-gray-500 mb-1">Detected Class</div>
                    <div className="text-2xl font-bold text-emerald-400">{result.class}</div>
                  </div>
                  <div className="bg-[#151515] p-4 rounded-md border border-gray-800">
                    <div className="text-sm text-gray-500 mb-1">Confidence Score</div>
                    <div className="text-2xl font-bold text-blue-400">{result.confidence}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
