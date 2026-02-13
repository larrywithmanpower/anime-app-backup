import { NextResponse } from 'next/server';
import { getAnimeData, updateAnimeProgress, fetchSheets, createSheet } from '@/lib/googleSheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sheet = searchParams.get('sheet') || undefined;

    if (action === 'getSheets') {
      const sheets = await fetchSheets();
      return NextResponse.json(sheets);
    }

    const rows = await getAnimeData(sheet);
    // Assuming Column A: Date, B: Name, C: Progress
    // We'll return them with their row index (1-based for Sheets)
    const data = (rows as string[][])
      .slice(1) // Skip header row
      .map((row: string[], index: number) => ({
        rowNumber: index + 2, // Account for skipping header and 1-based indexing
        date: row[0] || '',
        name: row[1] || '',
        progress: row[2] || '',
      })).filter(item => item.name); // Filter out empty rows

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sheet, rowNumber, name, progress } = body;

    console.log(`API POST [${action}]:`, body);

    // List of actions that need to be forwarded to Google Apps Script
    const forwardedActions = ['createSheet', 'addItem', 'deleteItem', 'updateName', 'deleteAccount'];

    if (forwardedActions.includes(action)) {
      // Prepare payload for GAS
      const payload: any = { action, sheet };

      if (action === 'createSheet') payload.name = name;
      if (action === 'addItem') payload.name = name;
      if (action === 'deleteItem') payload.row = rowNumber;
      if (action === 'updateName') {
        payload.row = rowNumber;
        payload.name = name;
      }
      if (action === 'deleteAccount') {
        payload.action = 'deleteAccount';
      }

      const res = await fetch(process.env.APPS_SCRIPT_URL!, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      console.log(`API POST [${action}] GAS Response:`, result);
      return NextResponse.json(result);
    }

    // Default: update progress (existing internal library call)
    if (!action || action === 'update') {
      const newProgress = progress.toString();
      await updateAnimeProgress(rowNumber, newProgress, sheet);
      return NextResponse.json({ success: true, newProgress });
    }

    return NextResponse.json({ error: 'Unsupported action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('API POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
