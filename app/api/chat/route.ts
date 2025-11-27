import { streamText, convertToModelMessages } from 'ai';
import { getAIModel, getAIModelFromSettings, type DynamicApiSettings } from '@/lib/ai-providers';
import { z } from "zod";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, xml, apiSettings } = await req.json();

    // Check if user provided custom API settings
    const userSettings = apiSettings as DynamicApiSettings | undefined;
    const hasValidUserSettings = userSettings?.apiKey && userSettings?.model && userSettings?.provider;

    console.log('[Chat API] User settings:', {
      provider: userSettings?.provider,
      model: userSettings?.model,
      hasApiKey: !!userSettings?.apiKey,
      baseUrl: userSettings?.baseUrl,
    });

    // Use user settings if provided and valid, otherwise fall back to env config
    const { model, providerOptions } = hasValidUserSettings
      ? getAIModelFromSettings(userSettings)
      : getAIModel();

    const systemMessage = `
You are an expert Business Process Management (BPM) diagram architect specializing in draw.io XML generation.
Your goal is to transform business logic into structurally sound, strictly formatted, and aesthetically professional Swimlane Diagrams (Cross-functional Flowcharts).

You utilize the following tools:
---Tool1---
tool name: display_diagram
description: Display a NEW diagram. Use this for creating the initial swimlane structure or major overhauls.
parameters: { xml: string }
---Tool2---
tool name: edit_diagram
description: Edit specific parts. Use strictly for text corrections or minor style fixes.
parameters: { edits: Array<{search: string, replace: string}> }
---End of tools---

### CRITICAL STYLE & LAYOUT RULES (Must Follow)

1. **Diagram Type: Horizontal Swimlanes (BPMN Style)**
   - Structure: Use a "Pool" containing multiple "Lanes" stacked vertically.
   - Flow Direction: Strictly **Left-to-Right**.
   - Swimlane XML Attributes:
     - The Pool MUST have: \`style="swimlane;childLayout=stackLayout;horizontal=1;startSize=40;horizontalStack=0;resizeParent=1;resizeParentMax=0;container=1;collapsible=0;"\`
     - The Lanes MUST have: \`style="swimlane;startSize=40;horizontal=0;..."\` (Title on the left, vertical).
   - **Important**: Do NOT create vertical swimlanes (where title is at the top and flow goes down).

2. **Aesthetic: Professional Black & White (No Color)**
   - **Color Palette**: Strictly Grayscale. \`fillColor=#ffffff\` (White), \`strokeColor=#000000\` (Black). Backgrounds of lanes can be \`#f5f5f5\` (Light Gray) to distinguish them.
   - **Design Principles**:
     - Alignment: Center-align process steps horizontally within their logical sequence.
     - Spacing: Maintain consistent horizontal gaps (e.g., 200px) between steps.
   - **Shapes**:
     - Process Step: \`rounded=0\` (Rectangle) or \`rounded=1\`.
     - Decision: \`rhombus\`.
     - Document/Attachment: \`shape=note\` or \`shape=document\`.
     - System/Database: \`shape=cylinder\` or \`shape=cylinder3\`.
     - Connector: \`edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;jettySize=auto;orthogonalLoop=1;\`.

3. **Coordinate & Sizing Logic (Fixing the "Run-off" issue)**
   - **Dynamic Width**: Do NOT restrict width to 800px. If the process is long, extend the X coordinates as needed (e.g., x=1500, x=2000 is acceptable).
   - **Container resizing**: Ensure the parent "Pool" and "Lanes" have a \`width\` large enough to encompass the right-most element.
   - **Relative Coordinates**: Remember that elements inside a Swimlane usually use coordinates relative to that lane (but in some draw.io groupings, they are absolute). **Best Practice**: Use absolute coordinates for clarity in generation, but ensure visual containment.

### XML GENERATION TEMPLATE (Swimlane Structure)

When creating a new diagram, always start with this structural skeleton to ensure horizontal lanes:

\`\`\`xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>

    <mxCell id="pool" value="Process Name" style="swimlane;childLayout=stackLayout;horizontal=1;startSize=40;horizontalStack=0;resizeParent=1;resizeParentMax=0;container=1;" vertex="1" parent="1">
      <mxGeometry x="40" y="40" width="1600" height="600" as="geometry"/> </mxCell>

    <mxCell id="lane1" value="Role A" style="swimlane;startSize=40;horizontal=0;html=1;" vertex="1" parent="pool">
      <mxGeometry x="0" y="40" width="1600" height="200" as="geometry"/>
    </mxCell>

    <mxCell id="lane2" value="Role B" style="swimlane;startSize=40;horizontal=0;html=1;" vertex="1" parent="pool">
      <mxGeometry x="0" y="240" width="1600" height="200" as="geometry"/>
    </mxCell>

    </root>
</mxGraphModel>
\`\`\`
`;

    const lastMessage = messages[messages.length - 1];

    // Extract text from the last message parts
    const lastMessageText = lastMessage.parts?.find((part: any) => part.type === 'text')?.text || '';

    // Extract file parts (images) from the last message
    const fileParts = lastMessage.parts?.filter((part: any) => part.type === 'file') || [];

    const formattedTextContent = `
Current diagram XML:
"""xml
${xml || ''}
"""
User input:
"""md
${lastMessageText}
"""`;

    // Convert UIMessages to ModelMessages and add system message
    const modelMessages = convertToModelMessages(messages);
    let enhancedMessages = [...modelMessages];

    // Update the last message with formatted content if it's a user message
    if (enhancedMessages.length >= 1) {
      const lastModelMessage = enhancedMessages[enhancedMessages.length - 1];
      if (lastModelMessage.role === 'user') {
        // Build content array with text and file parts
        const contentParts: any[] = [
          { type: 'text', text: formattedTextContent }
        ];

        // Add image parts back
        for (const filePart of fileParts) {
          contentParts.push({
            type: 'image',
            image: filePart.url,
            mimeType: filePart.mediaType
          });
        }

        enhancedMessages = [
          ...enhancedMessages.slice(0, -1),
          { ...lastModelMessage, content: contentParts }
        ];
      }
    }

    console.log("Enhanced messages:", enhancedMessages);

    const result = streamText({
      model,
      system: systemMessage,
      messages: enhancedMessages,
      ...(providerOptions && { providerOptions }),
      tools: {
        // Client-side tool that will be executed on the client
        display_diagram: {
          description: `Display a diagram on draw.io. You only need to pass the nodes inside the <root> tag (including the <root> tag itself) in the XML string.
          For example:
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxGeometry x="20" y="20" width="100" height="100" as="geometry"/>
            <mxCell id="2" value="Hello, World!" style="shape=rectangle" parent="1">
              <mxGeometry x="20" y="20" width="100" height="100" as="geometry"/>
            </mxCell>
          </root>
          - Note that when you need to generate diagram about aws architecture, use **AWS 2025 icons**.
          - If you are asked to generate animated connectors, make sure to include "flowAnimation=1" in the style of the connector elements.
          `,
          inputSchema: z.object({
            xml: z.string().describe("XML string to be displayed on draw.io")
          })
        },
        edit_diagram: {
          description: `Edit specific parts of the current diagram by replacing exact line matches. Use this tool to make targeted fixes without regenerating the entire XML.
IMPORTANT: Keep edits concise:
- Only include the lines that are changing, plus 1-2 surrounding lines for context if needed
- Break large changes into multiple smaller edits
- Each search must contain complete lines (never truncate mid-line)
- First match only - be specific enough to target the right element`,
          inputSchema: z.object({
            edits: z.array(z.object({
              search: z.string().describe("Exact lines to search for (including whitespace and indentation)"),
              replace: z.string().describe("Replacement lines")
            })).describe("Array of search/replace pairs to apply sequentially")
          })
        },
      },
      temperature: 0,
    });

    // Error handler function to provide detailed error messages
    function errorHandler(error: unknown) {
      if (error == null) {
        return 'unknown error';
      }

      if (typeof error === 'string') {
        return error;
      }

      if (error instanceof Error) {
        return error.message;
      }

      return JSON.stringify(error);
    }

    return result.toUIMessageStreamResponse({
      onError: errorHandler,
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
