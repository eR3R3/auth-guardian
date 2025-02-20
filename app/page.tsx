'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    credibility: number
    explanation: string
    warnings: string[]
  }>(null)

  const analyzeContent = async () => {
    setLoading(true)
    try {
      // In a real implementation, you would call your API here
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content:url }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <main className="p-6 min-h-screen text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Truth Guardian
        </h1>
        <p className="text-gray-400 mt-2">AI-Powered Fake News Detection</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter article URL or paste content"
            className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <button
          onClick={analyzeContent}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Content'}
        </button>
      </motion.div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <div className="bg-slate-700/30 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Analysis Result</h2>
            <div className="flex items-center mb-4">
              <div className="w-full bg-slate-600 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    result.credibility > 70
                      ? 'bg-green-500'
                      : result.credibility > 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${result.credibility}%` }}
                />
              </div>
              <span className="ml-2">{result.credibility}%</span>
            </div>
            <p className="text-gray-300">{result.explanation}</p>
          </div>

          {result?.warnings?.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-red-400">Warnings</h3>
              <ul className="list-disc list-inside space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="text-gray-300">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </main>
  )
}
