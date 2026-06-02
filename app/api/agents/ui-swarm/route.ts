import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { DESIGN_ARCHITECT_PROMPT, UI_CODER_PROMPT, UX_REVIEWER_PROMPT } from './prompts';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, leadName } = await req.json();

    if (!prompt || !leadName) {
      return NextResponse.json({ error: 'Prompt and leadName are required.' }, { status: 400 });
    }

    // 1. Architect Agent
    console.log(`🎨 UI Swarm: Architecting design for ${leadName}...`);
    const architectResponse = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DESIGN_ARCHITECT_PROMPT },
        { role: 'user', content: prompt }
      ]
    });
    
    const architecturePlan = architectResponse.choices[0].message.content;

    // 2. Coder Agent
    let currentCode = '';
    console.log('💻 UI Swarm: Generating HTML/CSS UI Component...');
    const coderResponse = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: UI_CODER_PROMPT },
        { role: 'user', content: `Lead Context: ${prompt}\n\nDesign Plan:\n${architecturePlan}` }
      ]
    });
    
    currentCode = coderResponse.choices[0].message.content || '';

    // Extract code block
    if (currentCode.includes('\`\`\`html')) {
        currentCode = currentCode.split('\`\`\`html')[1].split('\`\`\`')[0];
    } else if (currentCode.includes('\`\`\`')) {
        currentCode = currentCode.split('\`\`\`')[1].split('\`\`\`')[0];
    }

    // 3. QA Agent Loop
    let qaApproved = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!qaApproved && attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`🕵️ UI Swarm: UX Director reviewing UI (Attempt ${attempts}/${MAX_ATTEMPTS})...`);
      
      const qaResponse = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: UX_REVIEWER_PROMPT },
          { role: 'user', content: `Design Plan:\n${architecturePlan}\n\nGenerated UI Code:\n${currentCode}` }
        ]
      });

      const qaResultStr = qaResponse.choices[0].message.content || '{}';
      const qaResult = JSON.parse(qaResultStr);

      if (qaResult.approved) {
        console.log('✅ UI Swarm: UX Director APPROVED the design.');
        qaApproved = true;
      } else {
        console.log(`❌ UI Swarm: UX Director REJECTED. Critique: ${qaResult.critique}`);
        if (attempts >= MAX_ATTEMPTS) break;

        // Feed back to coder
        console.log('💻 UI Swarm: Coder fixing UI based on critique...');
        const fixResponse = await openai.chat.completions.create({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: UI_CODER_PROMPT },
            { role: 'user', content: `Design Plan:\n${architecturePlan}\n\nCurrent Code:\n${currentCode}\n\nUX Critique (Fix this):\n${qaResult.critique}` }
          ]
        });
        currentCode = fixResponse.choices[0].message.content || '';
        if (currentCode.includes('\`\`\`html')) {
            currentCode = currentCode.split('\`\`\`html')[1].split('\`\`\`')[0];
        } else if (currentCode.includes('\`\`\`')) {
            currentCode = currentCode.split('\`\`\`')[1].split('\`\`\`')[0];
        }
      }
    }

    // Save output to leads_frontend folder
    const outputDir = path.join(process.cwd(), 'leads_frontend');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const safeLeadName = leadName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(outputDir, `index.html`);
    fs.writeFileSync(filePath, currentCode.trim());

    return NextResponse.json({
      success: true,
      fileSavedAt: filePath,
      qaPassed: qaApproved,
      attempts
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ UI Swarm failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
