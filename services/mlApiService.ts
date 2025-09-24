// HTTP ML API client replacing WebSocket usage

export interface MLApiResult {
    success: boolean;
    studentId?: string;
    confidence?: number;
    timestamp?: Date;
    error?: string;
}

export interface MLApiError {
    type: 'LOW_CONFIDENCE' | 'TIMEOUT' | 'RECOGNITION_FAILED' | 'UNKNOWN';
    message: string;
    timestamp?: Date;
}

export interface AnalyzeFaceRequest {
    imageData: string; // base64
    sectionId: string;
    facultyId: string;
}

const ML_API_URL = process.env.EXPO_PUBLIC_ML_API_URL || '';

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const url = `${ML_API_URL}${path}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ML API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

export const mlApiService = {
    async analyzeFace(req: AnalyzeFaceRequest): Promise<MLApiResult> {
        try {
            const data = await postJson<{
                success: boolean;
                studentId?: string;
                confidence?: number;
                error?: string;
            }>(`/recognize`, {
                imageData: req.imageData,
                sectionId: req.sectionId,
                facultyId: req.facultyId,
            });

            return {
                success: data.success,
                studentId: data.studentId,
                confidence: data.confidence,
                error: data.error,
                timestamp: new Date(),
            };
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            return { success: false, error: message, timestamp: new Date(), confidence: 0 };
        }
    },
};


