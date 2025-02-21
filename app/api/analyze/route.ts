import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body?.content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey: process.env.HUNYUAN_API_KEY,
      baseURL: "https://api.hunyuan.cloud.tencent.com/v1"
    });

    const systemPrompt = `You are an expert fact-checker and credibility analyst. 请不要用MarkDown.
    Follow this EXACT format in your response:

    VERDICT: [Choose ONE: VERIFIED TRUE / LIKELY TRUE / UNVERIFIABLE / LIKELY FALSE / VERIFIED FALSE]

    CONFIDENCE: [Rate 1-10]

    EVIDENCE:
    - Primary Source: [Cite specific evidence]
    - Supporting Facts: [List 1-2 corroborating details]

    CREDIBILITY FACTORS:
    1. Source Quality: [Rate 1-10]
    2. Data Accuracy: [Rate 1-10]
    3. Context Completeness: [Rate 1-10]

    POTENTIAL ISSUES:
    - [List critical concerns]
    - [List secondary concerns if any]

    ANALYSIS SUMMARY:
    [2-3 sentences maximum]`;

    const completion = await client.chat.completions.create({
      model: 'hunyuan-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        { 
          role: 'user', 
          content: `
     ${body.content.trim().substring(0, 1000)}You are an expert fact-checker and credibility analyst. 请不要用MarkDown. 在合适的地方换行。
    Follow this EXACT format in your response:

    VERDICT: [Choose ONE: VERIFIED TRUE / LIKELY TRUE / UNVERIFIABLE / LIKELY FALSE / VERIFIED FALSE]

    CONFIDENCE: [Rate 1-10],

    EVIDENCE:
    - Primary Source: [Cite specific evidence]
    - Supporting Facts: [List 1-2 corroborating details]

    CREDIBILITY FACTORS:
    1. Source Quality: [Rate 1-10]
    2. Data Accuracy: [Rate 1-10]
    3. Context Completeness: [Rate 1-10]

    POTENTIAL ISSUES:
    - [List critical concerns]
    - [List secondary concerns if any]

    ANALYSIS SUMMARY:
    [2-3 sentences maximum]`
        }
      ],
      temperature: 0.2,
      max_tokens: 90,
      response_format: { type: "text" }
    });

    const analysis = completion.choices[0]?.message?.content || 'Analysis failed';
    console.log('API Response:', analysis);

    return NextResponse.json({
      credibility: calculateCredibilityScore(analysis),
      explanation: analysis,
      warnings: extractWarnings(analysis)
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function calculateCredibilityScore(analysis: string): number {
  const text = analysis.toLowerCase();
  let score = 60;

  const confidenceMatch = text.match(/confidence:\s*(\d+)/);
  const sourceQualityMatch = text.match(/source quality:\s*(\d+)/);
  const dataAccuracyMatch = text.match(/data accuracy:\s*(\d+)/);
  const contextMatch = text.match(/context completeness:\s*(\d+)/);

  const weights = {
    verdict: 0.35,
    confidence: 0.15,
    sourceQuality: 0.25,
    dataAccuracy: 0.25,
    context: 0.15
  };

  const verdictScore = (() => {
    if (text.includes('verified true')) return 100;
    if (text.includes('likely true')) return 85;
    if (text.includes('unverifiable')) return 60;
    if (text.includes('likely false')) return 30;
    if (text.includes('verified false')) return 0;
    return 60;
  })();
  score += (verdictScore - 50) * weights.verdict;

  if (confidenceMatch) {
    const confidence = parseInt(confidenceMatch[1]);
    score += (confidence * 12 - 50) * weights.confidence;
  }

  if (sourceQualityMatch) {
    const sourceQuality = parseInt(sourceQualityMatch[1]);
    score += (sourceQuality * 12 - 50) * weights.sourceQuality;
  }

  if (dataAccuracyMatch) {
    const dataAccuracy = parseInt(dataAccuracyMatch[1]);
    score += (dataAccuracy * 12 - 50) * weights.dataAccuracy;
  }

  if (contextMatch) {
    const context = parseInt(contextMatch[1]);
    score += (context * 12 - 50) * weights.context;
  }

  const modifiers = {
    strong_positive: ['verified by multiple sources', 'official confirmation', 'direct evidence', 'proven fact', 'widely accepted'],
    positive: ['verified', 'confirmed', 'proven', 'official source', 'direct evidence', 'reliable source', 'expert opinion', 'factual', 'documented'],
    supporting: ['consistent with', 'supported by', 'aligns with', 'corroborated', 'validated'],
    negative: ['misleading', 'incorrect', 'false claim', 'no evidence', 'contradicted'],
    uncertainty: ['possibly', 'unclear', 'insufficient data', 'conflicting']
  };

  modifiers.strong_positive.forEach(term => {
    if (text.includes(term)) score += 8;
  });

  modifiers.positive.forEach(term => {
    if (text.includes(term)) score += 6;
  });

  modifiers.supporting.forEach(term => {
    if (text.includes(term)) score += 4;
  });

  modifiers.negative.forEach(term => {
    if (text.includes(term)) score -= 4;
  });

  modifiers.uncertainty.forEach(term => {
    if (text.includes(term)) score -= 1;
  });

  if (text.includes('primary source')) score += 5;
  if (text.includes('multiple sources')) score += 5;
  if (text.includes('expert analysis')) score += 5;
  if (text.includes('recent data')) score += 3;
  if (text.includes('comprehensive')) score += 3;
  if (text.includes('high confidence')) score += 5;
  if (text.includes('strong evidence')) score += 5;

  if (text.includes('evidence') && text.includes('supporting facts')) score += 5;

  const sourceScore = sourceQualityMatch ? parseInt(sourceQualityMatch[1]) : 0;
  if (sourceScore >= 8) score += 8;
  else if (sourceScore >= 6) score += 5;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function extractWarnings(analysis: string): string[] {
  const warnings: string[] = [];
  const text = analysis.toLowerCase();

  const issuesMatch = text.match(/potential issues:([^]*?)(?=\n\n|$)/i);
  if (issuesMatch) {
    const issues = issuesMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace('-', '').trim());
    warnings.push(...issues);
  }

  const warningPatterns = {
    'source_quality': {
      pattern: /source quality:\s*([1-4])(\/|\s*out of\s*)10/i,
      message: 'Low quality sources detected'
    },
    'data_accuracy': {
      pattern: /data accuracy:\s*([1-4])(\/|\s*out of\s*)10/i,
      message: 'Poor data accuracy detected'
    },
    'context': {
      pattern: /context completeness:\s*([1-4])(\/|\s*out of\s*)10/i,
      message: 'Incomplete context'
    },
    'confidence': {
      pattern: /confidence:\s*([1-4])(\/|\s*out of\s*)10/i,
      message: 'Low confidence in analysis'
    }
  };

  Object.entries(warningPatterns).forEach(([key, {pattern, message}]) => {
    if (pattern.test(text)) {
      warnings.push(message);
    }
  });

  return [...new Set(warnings)];
}

// import { NextResponse } from 'next/server'
// import OpenAI from 'openai'

// const API_KEY = process.env.TENCENT_API_KEY || ''

// const openai = new OpenAI({
//   apiKey: `${API_KEY}`,
//   baseURL: 'https://api.lkeap.cloud.tencent.com/v1',
// });

// export async function POST(req: Request) {
//   const headers = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Methods': 'POST, OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type, Accept',
//   };

//   try {
//     const body = await req.json();
    
//     if (!body?.content || typeof body.content !== 'string') {
//       return NextResponse.json({
//         error: 'Invalid content',
//         details: 'Content must be a string'
//       }, { status: 400, headers });
//     }

//     if (body.content === 'Test connection') {
//       return NextResponse.json({
//         credibility: 100,
//         explanation: 'Server connection test successful',
//         warnings: []
//       }, { headers });
//     }

//     const content = body.content.trim().substring(0, 1000);

//     console.log('Making API request for content:', content.substring(0, 100) + '...');

//     const completion = await openai.chat.completions.create({
//       model: 'deepseek-r1',
//       messages: [
//         {
//           role: 'system',
//           content: `You are a fact-checker. Be extremely concise. For the given content:
//           1. Give a clear VERDICT: [TRUE/FALSE/PARTIALLY TRUE]
//           2. Provide ONE key piece of evidence
//           3. List up to TWO potential issues
//           Keep total response under 100 words.`
//         },
//         { role: 'user', content }
//       ],
//       temperature: 0.1,
//       max_tokens: 100,
//     });

//     const analysis = completion.choices[0].message.content || 'Analysis failed';
//     console.log('API Response:', analysis);

//     const result = {
//       credibility: calculateCredibilityScore(analysis),
//       explanation: analysis,
//       warnings: extractWarnings(analysis)
//     };

//     return NextResponse.json(result, { headers });

//   } catch (error) {
//     console.error('Error:', error);
//     return NextResponse.json({
//       error: 'Analysis failed',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500, headers });
//   }
// }

// function calculateCredibilityScore(analysis: string): number {
//   const text = analysis.toLowerCase();
  
//   // Check for explicit verdicts
//   if (text.includes('verdict: true')) {
//     return 90;
//   }
//   if (text.includes('verdict: false')) {
//     return 10;
//   }
//   if (text.includes('verdict: partially true')) {
//     return 50;
//   }

//   // Fallback scoring
//   let score = 50;
//   const indicators = {
//     positive: ['verified', 'confirmed', 'accurate', 'correct', 'proven'],
//     negative: ['false', 'incorrect', 'inaccurate', 'misleading', 'wrong'],
//     partial: ['partially', 'possibly', 'likely', 'maybe']
//   };

//   indicators.positive.forEach(word => {
//     if (text.includes(word)) score += 10;
//   });
//   indicators.negative.forEach(word => {
//     if (text.includes(word)) score -= 10;
//   });
//   indicators.partial.forEach(word => {
//     if (text.includes(word)) score += 5;
//   });

//   return Math.max(0, Math.min(100, score));
// }

// function extractWarnings(analysis: string): string[] {
//   const warnings: string[] = [];
//   const text = analysis.toLowerCase();

//   const patterns = {
//     'inaccurate': 'Information is inaccurate',
//     'misleading': 'Contains misleading content',
//     'partially': 'Partially incorrect information',
//     'lacks': 'Lacks supporting evidence',
//     'possible': 'Information needs verification',
//     'outdated': 'Information may be outdated'
//   };

//   Object.entries(patterns).forEach(([key, warning]) => {
//     if (text.includes(key)) {
//       warnings.push(warning);
//     }
//   });

//   return warnings;
// }

// // Helper functions for analysis
// function identifySources(content: string): string[] {
//   // Identify and verify mentioned sources
//   return [
//     "Referenced academic papers",
//     "News articles",
//     "Expert quotes"
//   ]
// }

// function analyzeSentiment(content: string) {
//   // Analyze emotional tone and bias
//   return {
//     tone: "slightly negative",
//     bias: "moderate left-leaning",
//     emotionalLanguage: "medium"
//   }
// }

// function calculateReadability(content: string) {
//   // Calculate readability metrics
//   return {
//     fleschKincaid: 10.5,
//     complexity: "moderate",
//     technicalTerms: 12
//   }
// }

// function extractFactualClaims(content: string) {
//   // Extract and verify factual claims
//   return [
//     {
//       claim: "Example factual claim",
//       verification: "partially verified",
//       sources: ["source1", "source2"]
//     }
//   ]
// }

// function generateRelatedSources(content: string) {
//   // Suggest related reliable sources
//   return [
//     {
//       title: "Related academic paper",
//       url: "https://example.com/paper",
//       reliability: "high"
//     }
//   ]
// }