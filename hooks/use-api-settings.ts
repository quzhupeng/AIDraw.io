import { useState, useEffect } from 'react';

export type ProviderName =
    | 'bedrock'
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'azure'
    | 'ollama'
    | 'openrouter'
    // 中国大模型
    | 'deepseek'
    | 'zhipu'
    | 'qwen'
    | 'doubao'
    | 'moonshot'
    | 'baichuan'
    | 'minimax';

export interface ApiSettings {
    provider: ProviderName;
    apiKey: string;
    model: string;
    baseUrl?: string;
}

const DEFAULT_SETTINGS: ApiSettings = {
    provider: 'openai',
    apiKey: '',
    model: '',
    baseUrl: '',
};

const STORAGE_KEY = 'anran-api-settings';

export function useApiSettings() {
    const [settings, setSettings] = useState<ApiSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            } catch (e) {
                console.error('Failed to parse API settings', e);
            }
        }
        setIsLoaded(true);
    }, []);

    const saveSettings = (newSettings: ApiSettings) => {
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    };

    return {
        settings,
        saveSettings,
        isLoaded,
    };
}
