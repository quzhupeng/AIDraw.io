"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useApiSettings, type ApiSettings, type ProviderName } from "@/hooks/use-api-settings";
import { Eye, EyeOff } from "lucide-react";

interface ApiSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PROVIDER_OPTIONS: { value: ProviderName; label: string; needsApiKey: boolean; needsBaseUrl: boolean; category?: string }[] = [
    // 国际大模型
    { value: "openai", label: "OpenAI", needsApiKey: true, needsBaseUrl: true, category: "international" },
    { value: "anthropic", label: "Anthropic (Claude)", needsApiKey: true, needsBaseUrl: false, category: "international" },
    { value: "google", label: "Google (Gemini)", needsApiKey: true, needsBaseUrl: false, category: "international" },
    { value: "openrouter", label: "OpenRouter", needsApiKey: true, needsBaseUrl: false, category: "international" },
    { value: "ollama", label: "Ollama (本地)", needsApiKey: false, needsBaseUrl: true, category: "international" },
    { value: "azure", label: "Azure OpenAI", needsApiKey: true, needsBaseUrl: true, category: "international" },
    { value: "bedrock", label: "AWS Bedrock", needsApiKey: false, needsBaseUrl: false, category: "international" },
    // 中国大模型
    { value: "deepseek", label: "DeepSeek (深度求索)", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "zhipu", label: "智谱 GLM", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "qwen", label: "通义千问 (阿里)", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "doubao", label: "豆包 (字节跳动)", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "moonshot", label: "Moonshot (月之暗面)", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "baichuan", label: "百川智能", needsApiKey: true, needsBaseUrl: false, category: "china" },
    { value: "minimax", label: "MiniMax", needsApiKey: true, needsBaseUrl: false, category: "china" },
];

const DEFAULT_MODELS: Record<ProviderName, string[]> = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: ["claude-sonnet-4-5-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    google: ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"],
    openrouter: ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.0-flash-exp"],
    ollama: ["llama3.2", "llama3.1", "mistral", "codellama", "qwen2.5"],
    azure: ["gpt-4o", "gpt-4-turbo"],
    bedrock: ["anthropic.claude-sonnet-4-5-20250514-v1:0", "anthropic.claude-3-5-sonnet-20241022-v2:0"],
    // 中国大模型
    deepseek: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    zhipu: ["glm-4-plus", "glm-4-air", "glm-4-flash", "glm-4v-plus", "glm-4.6", "glm-4-0520", "glm-4-long"],
    qwen: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-vl-max"],
    doubao: ["doubao-pro-256k", "doubao-pro-32k", "doubao-lite-32k"],
    moonshot: ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    baichuan: ["Baichuan4", "Baichuan3-Turbo", "Baichuan2-Turbo"],
    minimax: ["abab6.5s-chat", "abab6.5-chat", "abab5.5-chat"],
};

export function ApiSettingsDialog({ open, onOpenChange }: ApiSettingsDialogProps) {
    const { settings, saveSettings, isLoaded } = useApiSettings();
    const [localSettings, setLocalSettings] = useState<ApiSettings>(settings);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (isLoaded) {
            setLocalSettings(settings);
        }
    }, [settings, isLoaded]);

    const currentProviderConfig = PROVIDER_OPTIONS.find(p => p.value === localSettings.provider);
    const suggestedModels = DEFAULT_MODELS[localSettings.provider] || [];

    const handleProviderChange = (value: ProviderName) => {
        setLocalSettings(prev => ({
            ...prev,
            provider: value,
            model: DEFAULT_MODELS[value]?.[0] || "",
            baseUrl: value === "ollama" ? "http://localhost:11434/api" : "",
        }));
    };

    const handleSave = () => {
        saveSettings(localSettings);
        onOpenChange(false);
    };

    const handleCancel = () => {
        setLocalSettings(settings);
        onOpenChange(false);
    };

    if (!isLoaded) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>API Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI provider and API key. Your settings are stored locally in your browser.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="provider">AI Provider</Label>
                        <Select
                            value={localSettings.provider}
                            onValueChange={handleProviderChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>国际大模型</SelectLabel>
                                    {PROVIDER_OPTIONS.filter(o => o.category === "international").map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>中国大模型</SelectLabel>
                                    {PROVIDER_OPTIONS.filter(o => o.category === "china").map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* API Key */}
                    {currentProviderConfig?.needsApiKey && (
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    value={localSettings.apiKey}
                                    onChange={e => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="Enter your API key"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Model Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Select
                            value={localSettings.model}
                            onValueChange={value => setLocalSettings(prev => ({ ...prev, model: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {suggestedModels.map(model => (
                                    <SelectItem key={model} value={model}>
                                        {model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Or enter a custom model ID below
                        </p>
                        <Input
                            value={localSettings.model}
                            onChange={e => setLocalSettings(prev => ({ ...prev, model: e.target.value }))}
                            placeholder="Custom model ID"
                        />
                    </div>

                    {/* Base URL (for OpenAI-compatible or Ollama) */}
                    {currentProviderConfig?.needsBaseUrl && (
                        <div className="space-y-2">
                            <Label htmlFor="baseUrl">
                                Base URL {localSettings.provider === "ollama" ? "" : "(Optional)"}
                            </Label>
                            <Input
                                id="baseUrl"
                                value={localSettings.baseUrl || ""}
                                onChange={e => setLocalSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                                placeholder={
                                    localSettings.provider === "ollama"
                                        ? "http://localhost:11434/api"
                                        : localSettings.provider === "openai"
                                            ? "https://api.openai.com/v1 (default)"
                                            : "Custom API endpoint"
                                }
                            />
                            {localSettings.provider === "openai" && (
                                <p className="text-xs text-muted-foreground">
                                    Leave empty for official OpenAI API, or enter a custom endpoint for OpenAI-compatible services.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Info for Bedrock */}
                    {localSettings.provider === "bedrock" && (
                        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                            AWS Bedrock uses server-side environment variables for authentication.
                            Make sure <code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code> are configured on the server.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Settings
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
