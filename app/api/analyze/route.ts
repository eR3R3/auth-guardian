import { NextResponse } from 'next/server'

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
const API_KEY = process.env.QWEN_API_KEY || ''

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    const body = await req.json();
    
    if (!body?.content || typeof body.content !== 'string') {
      return NextResponse.json({
        error: 'Invalid content',
        details: 'Content must be a string'
      }, { status: 400, headers });
    }

    const content = body.content.trim().substring(0, 1000);

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        input: {
          messages: [
            {
              role: 'system',
              content: `You are a fact-checker. Be extremely concise. For the given content:
              1. Give a clear VERDICT: [TRUE/FALSE/PARTIALLY TRUE]
              2. Provide ONE key piece of evidence
              3. List up to TWO potential issues
              Keep total response under 100 words.`
            },
            {
              role: 'user',
              content
            }
          ]
        },
        parameters: {
          result_format: 'text',
          max_tokens: 100,  // Limit response length
          temperature: 0.1, // More focused responses
          top_p: 0.5,      // More deterministic
          enable_search: true,
        },
        enable_search: true,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Response:', errorData);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const analysis = data.output?.text || '';

    const result = {
      credibility: calculateCredibilityScore(analysis),
      explanation: analysis,
      warnings: extractWarnings(analysis)
    };

    return NextResponse.json(result, { headers });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers });
  }
}

function calculateCredibilityScore(analysis: string): number {
  const text = analysis.toLowerCase();
  
  // Check for explicit verdicts
  if (text.includes('verdict: true')) {
    return 90;
  }
  if (text.includes('verdict: false')) {
    return 10;
  }
  if (text.includes('verdict: partially true')) {
    return 50;
  }

  // Fallback scoring
  let score = 50;
  const indicators = {
    positive: ['verified', 'confirmed', 'accurate', 'correct', 'proven'],
    negative: ['false', 'incorrect', 'inaccurate', 'misleading', 'wrong'],
    partial: ['partially', 'possibly', 'likely', 'maybe']
  };

  indicators.positive.forEach(word => {
    if (text.includes(word)) score += 10;
  });
  indicators.negative.forEach(word => {
    if (text.includes(word)) score -= 10;
  });
  indicators.partial.forEach(word => {
    if (text.includes(word)) score += 5;
  });

  return Math.max(0, Math.min(100, score));
}

function extractWarnings(analysis: string): string[] {
  const warnings: string[] = [];
  const text = analysis.toLowerCase();

  const patterns = {
    'inaccurate': 'Information is inaccurate',
    'misleading': 'Contains misleading content',
    'partially': 'Partially incorrect information',
    'lacks': 'Lacks supporting evidence',
    'possible': 'Information needs verification',
    'outdated': 'Information may be outdated'
  };

  Object.entries(patterns).forEach(([key, warning]) => {
    if (text.includes(key)) {
      warnings.push(warning);
    }
  });

  return warnings;
}

// Helper functions for analysis
function identifySources(content: string): string[] {
  // Identify and verify mentioned sources
  return [
    "Referenced academic papers",
    "News articles",
    "Expert quotes"
  ]
}

function analyzeSentiment(content: string) {
  // Analyze emotional tone and bias
  return {
    tone: "slightly negative",
    bias: "moderate left-leaning",
    emotionalLanguage: "medium"
  }
}

function calculateReadability(content: string) {
  // Calculate readability metrics
  return {
    fleschKincaid: 10.5,
    complexity: "moderate",
    technicalTerms: 12
  }
}

function extractFactualClaims(content: string) {
  // Extract and verify factual claims
  return [
    {
      claim: "Example factual claim",
      verification: "partially verified",
      sources: ["source1", "source2"]
    }
  ]
}

function generateRelatedSources(content: string) {
  // Suggest related reliable sources
  return [
    {
      title: "Related academic paper",
      url: "https://example.com/paper",
      reliability: "high"
    }
  ]
}