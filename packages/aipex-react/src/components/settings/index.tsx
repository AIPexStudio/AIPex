import {
  AI_PROVIDERS,
  type AIProviderKey,
  type AppSettings,
  type CustomModelConfig,
  detectProviderFromHost,
  type ProviderType,
  STORAGE_KEYS,
} from "@aipexstudio/aipex-core";
import {
  Bot,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  Globe,
  Info,
  Mail,
  MessageCircle,
  MessageSquare,
  Palette,
  Plus,
  Search,
  Settings,
  Trash2,
  Twitter,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n/context";
import { createAIProvider } from "../../lib/ai-provider";
import { cn } from "../../lib/utils";
import { useTheme } from "../../theme/context";
import { DEFAULT_MODELS } from "../chatbot/constants";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { SaveStatus, SettingsPageProps, SettingsTab } from "./types";

const PROVIDER_TYPE_TO_KEY: Record<ProviderType, AIProviderKey> = {
  openai: "openai",
  google: "google",
  claude: "anthropic",
};

const PROVIDER_KEY_TO_TYPE: Partial<Record<AIProviderKey, ProviderType>> = {
  openai: "openai",
  google: "google",
  anthropic: "claude",
};

const buildDefaultProviderModels = (): CustomModelConfig[] =>
  (
    Object.entries(AI_PROVIDERS) as [
      AIProviderKey,
      (typeof AI_PROVIDERS)[AIProviderKey],
    ][]
  ).map(([key, provider]) => ({
    id: `builtin-${key}`,
    name: provider.name,
    providerType: provider.providerType,
    aiHost: "host" in provider ? (provider.host ?? "") : "",
    aiToken: "",
    aiModel: provider.models[0] ?? "",
    enabled: false,
  }));

const mergeWithDefaultProviders = (
  models: CustomModelConfig[],
): CustomModelConfig[] => {
  const existingIds = new Set(models.map((model) => model.id));
  const merged = [...models];
  for (const model of buildDefaultProviderModels()) {
    if (!existingIds.has(model.id)) {
      merged.push(model);
    }
  }
  return merged;
};

const resolveProviderKey = (
  model: Pick<CustomModelConfig, "aiHost" | "providerType"> &
    Partial<Pick<CustomModelConfig, "id">>,
): AIProviderKey => {
  if (model.id?.startsWith("builtin-")) {
    const key = model.id.slice("builtin-".length) as AIProviderKey;
    if (AI_PROVIDERS[key]) return key;
  }
  const detected = model.aiHost ? detectProviderFromHost(model.aiHost) : null;
  if (detected && AI_PROVIDERS[detected]) {
    return detected;
  }
  return PROVIDER_TYPE_TO_KEY[model.providerType] ?? "openai";
};

const DEFAULT_MODEL_AUTO_VALUE = "__use-first-available__";

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createEmptyCustomModel = (
  providerType: ProviderType = "openai",
): CustomModelConfig => {
  const providerKey = PROVIDER_TYPE_TO_KEY[providerType];
  const providerMeta = AI_PROVIDERS[providerKey];
  return {
    id: generateId(),
    name: "",
    providerType,
    aiHost:
      providerMeta && "host" in providerMeta ? (providerMeta.host ?? "") : "",
    aiToken: "",
    aiModel: providerMeta?.models?.[0] ?? "",
    enabled: false,
  };
};

interface ResolvedModelConfig {
  activeModel: CustomModelConfig | undefined;
  aiHost: string;
  aiToken: string;
  aiModel: string;
  providerType: ProviderType;
  providerKey: AIProviderKey;
}

const resolveActiveModel = (
  settings: AppSettings,
  customModels: CustomModelConfig[],
  selectedModelId: string | null,
): ResolvedModelConfig => {
  const enabledModels = settings.byokEnabled
    ? customModels.filter((model) => model.enabled)
    : [];
  const selected = selectedModelId
    ? customModels.find((model) => model.id === selectedModelId)
    : undefined;
  const activeModel =
    settings.byokEnabled && selected?.enabled
      ? selected
      : settings.byokEnabled
        ? enabledModels[0]
        : undefined;

  const providerType =
    activeModel?.providerType ?? settings.providerType ?? "openai";
  const providerKey: AIProviderKey =
    activeModel !== undefined
      ? resolveProviderKey({
          aiHost: activeModel.aiHost ?? "",
          providerType: providerType as ProviderType,
        })
      : (settings.aiProvider ?? "openai");
  const providerMeta = AI_PROVIDERS[providerKey];

  const aiHost =
    activeModel?.aiHost ??
    (providerMeta && "host" in providerMeta ? (providerMeta.host ?? "") : "") ??
    settings.aiHost ??
    "";
  const aiToken = activeModel?.aiToken ?? settings.aiToken ?? "";
  const aiModel = activeModel?.aiModel ?? settings.aiModel ?? "";

  return {
    activeModel,
    aiHost,
    aiToken,
    aiModel,
    providerType: providerType as ProviderType,
    providerKey,
  };
};

const ERROR_MESSAGES = {
  enableOneModel: {
    zh: "请先启用至少一个模型",
    en: "Please enable at least one model",
  },
  fillRequired: {
    zh: "请填写所有必填字段",
    en: "Please fill in all required fields",
  },
} as const;

const createErrorMessage = (
  key: keyof typeof ERROR_MESSAGES,
  language: string,
): string => {
  return ERROR_MESSAGES[key][language as "zh" | "en"] ?? ERROR_MESSAGES[key].en;
};

export function SettingsPage({
  storageAdapter,
  storageKey = STORAGE_KEYS.SETTINGS,
  className,
  onSave,
  onTestConnection,
}: SettingsPageProps) {
  const { t, language, changeLanguage } = useTranslation();
  const { theme, changeTheme, effectiveTheme } = useTheme();

  useEffect(() => {
    const container = document.querySelector("#root");
    if (container) {
      if (effectiveTheme === "dark") {
        container.classList.add("dark");
      } else {
        container.classList.remove("dark");
      }
    }
  }, [effectiveTheme]);

  const [settings, setSettings] = useState<AppSettings>({});
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    type: "",
    message: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [dataSharingEnabled, setDataSharingEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await storageAdapter.load(storageKey);
        if (result) {
          const loadedSettings = result as AppSettings;
          let loadedCustomModels = loadedSettings.customModels ?? [];
          const resolvedProviderType =
            loadedSettings.providerType ??
            PROVIDER_KEY_TO_TYPE[loadedSettings.aiProvider as AIProviderKey] ??
            "openai";

          if (
            loadedSettings.byokEnabled &&
            loadedCustomModels.length === 0 &&
            (loadedSettings.aiHost ||
              loadedSettings.aiToken ||
              loadedSettings.aiModel)
          ) {
            loadedCustomModels = [
              {
                id: generateId(),
                name: loadedSettings.aiModel,
                providerType: resolvedProviderType,
                aiHost: loadedSettings.aiHost ?? "",
                aiToken: loadedSettings.aiToken ?? "",
                aiModel: loadedSettings.aiModel ?? "",
                enabled: true,
              },
            ];
          }

          const mergedCustomModels =
            mergeWithDefaultProviders(loadedCustomModels);

          setSettings({
            ...loadedSettings,
            customModels: mergedCustomModels,
            providerType: resolvedProviderType,
            providerEnabled: loadedSettings.providerEnabled ?? false,
          });

          setCustomModels(mergedCustomModels);
          const initialSelection = loadedSettings.byokEnabled
            ? mergedCustomModels.find((model) => model.enabled)?.id ||
              mergedCustomModels[0]?.id ||
              null
            : null;
          setSelectedModelId(initialSelection);

          const loadedDataSharing =
            loadedSettings.dataSharingEnabled !== undefined
              ? loadedSettings.dataSharingEnabled
              : true;
          setDataSharingEnabled(loadedDataSharing);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [storageAdapter, storageKey]);

  const updateSettingsFromModel = useCallback((model: CustomModelConfig) => {
    const providerKey = resolveProviderKey(model);
    setSettings((prev: AppSettings) => ({
      ...prev,
      aiHost: model.aiHost,
      aiToken: model.aiToken,
      aiModel: model.aiModel,
      aiProvider: providerKey,
      providerType: model.providerType,
      providerEnabled: (prev.byokEnabled ?? false) && model.enabled,
    }));
  }, []);

  useEffect(() => {
    setSettings((prev: AppSettings) => {
      const byok = prev.byokEnabled ?? false;
      const anyEnabled = byok && customModels.some((model) => model.enabled);
      return {
        ...prev,
        customModels,
        providerEnabled: anyEnabled,
      };
    });
  }, [customModels]);

  useEffect(() => {
    if (!selectedModelId) return;
    const selected = customModels.find((model) => model.id === selectedModelId);
    if (selected) {
      updateSettingsFromModel(selected);
    }
  }, [customModels, selectedModelId, updateSettingsFromModel]);

  const handleSelectModel = useCallback(
    (id: string) => {
      setSelectedModelId(id);
      const target = customModels.find((model) => model.id === id);
      if (target) {
        updateSettingsFromModel(target);
      }
    },
    [customModels, updateSettingsFromModel],
  );

  const handleModelFieldChange = useCallback(
    <K extends keyof CustomModelConfig>(
      key: K,
      value: CustomModelConfig[K],
    ) => {
      if (!selectedModelId) return;
      setCustomModels((prev) => {
        const next = prev.map((model) =>
          model.id === selectedModelId ? { ...model, [key]: value } : model,
        );
        const updated = next.find((model) => model.id === selectedModelId);
        if (updated) {
          updateSettingsFromModel(updated);
        }
        return next;
      });
    },
    [selectedModelId, updateSettingsFromModel],
  );

  const handleAddModel = useCallback(() => {
    const providerType = settings.providerType ?? "openai";
    const newModel = createEmptyCustomModel(providerType);
    setCustomModels((prev) => [...prev, newModel]);
    setSelectedModelId(newModel.id);
    updateSettingsFromModel(newModel);
  }, [settings.providerType, updateSettingsFromModel]);

  const handleDeleteModel = useCallback(
    (id: string) => {
      setCustomModels((prev) => {
        const remaining = prev.filter((model) => model.id !== id);
        const deletedModel = prev.find((model) => model.id === id);
        const nextSelected =
          selectedModelId === id ? (remaining[0]?.id ?? null) : selectedModelId;
        setSelectedModelId(nextSelected);
        if (nextSelected) {
          const nextModel = remaining.find(
            (model) => model.id === nextSelected,
          );
          if (nextModel) {
            updateSettingsFromModel(nextModel);
          }
        } else {
          setSettings((prevSettings: AppSettings) => ({
            ...prevSettings,
            aiHost: "",
            aiToken: "",
            aiModel: "",
            providerEnabled: false,
            defaultModel:
              prevSettings.defaultModel &&
              deletedModel &&
              prevSettings.defaultModel === deletedModel.aiModel
                ? undefined
                : prevSettings.defaultModel,
          }));
        }
        return remaining;
      });
    },
    [selectedModelId, updateSettingsFromModel],
  );

  const handleToggleByok = useCallback(
    (checked: boolean) => {
      setSettings((prev: AppSettings) => ({
        ...prev,
        byokEnabled: checked,
        providerEnabled:
          checked && (prev.customModels ?? customModels).some((m) => m.enabled),
      }));

      if (checked) {
        const seeded = mergeWithDefaultProviders(customModels);
        setCustomModels(seeded);
        if ((!selectedModelId || customModels.length === 0) && seeded[0]) {
          setSelectedModelId(seeded[0].id);
          updateSettingsFromModel(seeded[0]);
        }
      }

      if (!checked) {
        setSelectedModelId(null);
      }
    },
    [customModels, selectedModelId, updateSettingsFromModel],
  );

  const defaultModelOptions = useMemo(() => {
    const baseOptions = DEFAULT_MODELS.map(
      (model: { name: string; value: string }) => ({
        value: model.value,
        label: model.name,
      }),
    );

    const customOptions = customModels
      .filter((model) => model.enabled && model.aiModel.trim())
      .map((model) => ({
        value: model.aiModel,
        label:
          model.name?.trim() ||
          `${model.aiModel} (custom-${model.providerType})`,
      }));

    const seen = new Set<string>();
    const options = [...customOptions, ...baseOptions].filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });

    if (settings.defaultModel && !seen.has(settings.defaultModel)) {
      options.push({
        value: settings.defaultModel,
        label: settings.defaultModel,
      });
    }

    return options;
  }, [customModels, settings.defaultModel]);

  const handleDefaultModelChange = useCallback((value: string) => {
    setSettings((prev: AppSettings) => ({
      ...prev,
      defaultModel: value === DEFAULT_MODEL_AUTO_VALUE ? undefined : value,
    }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus({ type: "", message: "" });

    const enabledModels = settings.byokEnabled
      ? customModels.filter((model) => model.enabled)
      : [];

    const availableDefaultModels = new Set(
      defaultModelOptions.map((option) => option.value),
    );
    const resolvedDefaultModel =
      settings.defaultModel && availableDefaultModels.has(settings.defaultModel)
        ? settings.defaultModel
        : undefined;

    if (settings.byokEnabled) {
      const hasIncomplete = enabledModels.some(
        (model) => !model.aiToken || !model.aiModel,
      );
      if (hasIncomplete) {
        setSaveStatus({
          type: "error",
          message: createErrorMessage("fillRequired", language),
        });
        setIsSaving(false);
        return;
      }
    }

    try {
      const {
        activeModel,
        aiHost,
        aiToken,
        aiModel,
        providerType,
        providerKey,
      } = resolveActiveModel(settings, customModels, selectedModelId);

      const settingsToSave = {
        ...settings,
        aiHost,
        aiToken,
        aiModel,
        aiProvider: providerKey,
        providerType,
        providerEnabled:
          settings.byokEnabled && enabledModels.length > 0
            ? (activeModel?.enabled ?? false)
            : false,
        customModels,
        dataSharingEnabled,
        defaultModel: resolvedDefaultModel,
      };
      await storageAdapter.save(storageKey, settingsToSave);
      onSave?.(settingsToSave);
      setSaveStatus({
        type: "success",
        message: t("settings.saveSuccess"),
      });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus({
        type: "error",
        message: t("settings.saveError"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    settings,
    customModels,
    selectedModelId,
    dataSharingEnabled,
    storageAdapter,
    storageKey,
    onSave,
    language,
    t,
    defaultModelOptions,
  ]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setSaveStatus({ type: "", message: "" });

    const { activeModel, aiHost, aiToken, aiModel, providerType, providerKey } =
      resolveActiveModel(settings, customModels, selectedModelId);

    if (settings.byokEnabled && !activeModel) {
      setSaveStatus({
        type: "error",
        message: createErrorMessage("enableOneModel", language),
      });
      setIsTesting(false);
      return;
    }

    if (!aiToken || !aiModel) {
      setSaveStatus({
        type: "error",
        message: createErrorMessage("fillRequired", language),
      });
      setIsTesting(false);
      return;
    }

    try {
      if (onTestConnection) {
        const success = await onTestConnection({
          ...settings,
          aiHost,
          aiToken,
          aiModel,
          aiProvider: providerKey,
          providerType,
          customModels,
        });
        if (success) {
          setSaveStatus({
            type: "success",
            message: t("settings.testSuccess"),
          });
        } else {
          setSaveStatus({
            type: "error",
            message: t("settings.testFailed"),
          });
        }
      } else {
        // Default test implementation - use AI SDK directly (same as runtime)
        const { generateText } = await import("ai");
        
        // Create provider using the same logic as runtime
        const provider = createAIProvider({
          aiProvider: providerKey,
          aiHost,
          aiToken,
          aiModel,
        });
        
        // Use AI SDK to make the request (handles all URL construction automatically)
        await generateText({
          model: provider(aiModel),
          prompt: "Hi",
        });

        setSaveStatus({
          type: "success",
          message: t("settings.testSuccess"),
        });
      }
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 5000);
    } catch (error) {
      console.error("Connection test error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setSaveStatus({
        type: "error",
        message: `${t("settings.testFailed")}: ${errorMessage}`,
      });
      setTimeout(() => setSaveStatus({ type: "", message: "" }), 8000);
    } finally {
      setIsTesting(false);
    }
  }, [settings, customModels, selectedModelId, onTestConnection, t, language]);

  const handleReset = useCallback(() => {
    if (confirm(t("settings.resetConfirm"))) {
      setCustomModels([]);
      setSettings({});
      setSelectedModelId(null);
      setSaveStatus({
        type: "info",
        message:
          language === "zh"
            ? "设置已重置，请记得保存"
            : "Settings reset, remember to save",
      });
    }
  }, [t, language]);

  const handleDataSharingChange = useCallback(
    async (value: string) => {
      const newValue = value === "share";
      setDataSharingEnabled(newValue);

      try {
        await storageAdapter.save(storageKey, {
          ...settings,
          dataSharingEnabled: newValue,
        });
      } catch (error) {
        console.error("Error saving data sharing setting:", error);
      }
    },
    [storageAdapter, storageKey, settings],
  );

  const filteredModels = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return customModels;
    return customModels.filter((model) => {
      const name = model.name?.toLowerCase() ?? "";
      const modelName = model.aiModel?.toLowerCase() ?? "";
      return name.includes(term) || modelName.includes(term);
    });
  }, [customModels, searchTerm]);

  const selectedModel = selectedModelId
    ? customModels.find((model) => model.id === selectedModelId)
    : undefined;

  const selectedProviderKey: AIProviderKey = selectedModel
    ? resolveProviderKey(selectedModel)
    : ("openai" as AIProviderKey);

  const selectedProviderMeta = AI_PROVIDERS[selectedProviderKey];
  const enabledCustomModelsForActions = customModels.filter(
    (model) => model.enabled,
  );
  const actionModel = selectedModel?.enabled
    ? selectedModel
    : enabledCustomModelsForActions[0];
  const canTest =
    !!actionModel &&
    actionModel.enabled &&
    Boolean(actionModel.aiToken) &&
    Boolean(actionModel.aiModel);
  const canSave =
    !settings.byokEnabled ||
    enabledCustomModelsForActions.length === 0 ||
    canTest;

  if (isLoading) {
    return (
      <div
        className={cn(
          "min-h-screen bg-background flex items-center justify-center",
          className,
        )}
      >
        <Card className="w-80">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">{t("common.processing")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
          </div>
          <p className="text-muted-foreground">
            {language === "zh"
              ? "配置你的 AIPex 扩展"
              : "Configure your AIPex extension"}
          </p>
        </div>

        {/* Status Message */}
        {saveStatus.message && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 min-w-[300px] max-w-md">
            <Alert
              variant={saveStatus.type === "error" ? "destructive" : "default"}
              className="animate-in slide-in-from-top"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {saveStatus.type === "success" && (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {saveStatus.type === "error" && (
                    <XCircle className="h-4 w-4" />
                  )}
                  {saveStatus.type === "info" && <Info className="h-4 w-4" />}
                  <AlertDescription className="font-medium">
                    {saveStatus.message}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveStatus({ type: "", message: "" })}
                  className="h-6 w-6 p-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value as SettingsTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("settings.general")}
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t("settings.aiConfiguration")}
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* Language Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t("settings.language")}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "选择您的首选语言"
                    : "Choose your preferred language"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {(["en", "zh"] as const).map((lang) => (
                    <Button
                      key={lang}
                      variant={language === lang ? "default" : "outline"}
                      onClick={() => changeLanguage(lang)}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-lg">
                        {lang === "en" ? "🇺🇸" : "🇨🇳"}
                      </span>
                      <span className="font-medium">
                        {t(`language.${lang}`)}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t("settings.theme")}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "选择您喜欢的主题"
                    : "Choose your preferred theme"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(["light", "dark", "system"] as const).map((themeOption) => (
                    <Button
                      key={themeOption}
                      variant={theme === themeOption ? "default" : "outline"}
                      onClick={() => changeTheme(themeOption)}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">
                        {themeOption === "light" && "☀️"}
                        {themeOption === "dark" && "🌙"}
                        {themeOption === "system" && "💻"}
                      </span>
                      <span className="text-sm font-medium">
                        {t(`theme.${themeOption}`)}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Privacy Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t("settings.privacy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded border border-foreground/20">
                          {dataSharingEnabled && (
                            <CheckCircle className="w-3 h-3 text-foreground" />
                          )}
                        </div>
                        <span className="font-medium text-sm">
                          {dataSharingEnabled
                            ? t("settings.dataSharingEnabled")
                            : t("settings.dataSharingDisabled")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {dataSharingEnabled
                          ? t("settings.dataSharingDescription")
                          : t("settings.privacyModeDescription")}
                      </p>
                    </div>
                    <Select
                      value={dataSharingEnabled ? "share" : "privacy"}
                      onValueChange={handleDataSharingChange}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="share">
                          {language === "zh" ? "共享数据" : "Share Data"}
                        </SelectItem>
                        <SelectItem value="privacy">
                          {language === "zh" ? "隐私模式" : "Privacy Mode"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Us Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("settings.aboutUs")}
                </CardTitle>
                <CardDescription>
                  {t("settings.aboutDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="default">
                      <a
                        href="https://github.com/AIPexStudio/AIPex"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.starOnGithub")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="outline">
                      <a
                        href="https://discord.gg/sfZC3G5qfe"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.joinDiscord")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="outline">
                      <a
                        href="https://www.claudechrome.com/contact"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.joinWechat")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="outline">
                      <a href="mailto:aipexassistant@gmail.com">
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.sendEmail")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="outline">
                      <a
                        href="https://x.com/weikangzhang3"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.followTwitter")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="outline">
                      <a
                        href="https://www.claudechrome.com/feedback"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("settings.feedback")}</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Configuration Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      {language === "zh" ? "默认模型" : "Default model"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "zh"
                        ? "新建会话优先使用该模型；未选择时使用列表首个可用模型"
                        : "New chats start with this model; otherwise use the first available"}
                    </p>
                  </div>
                  <Select
                    value={settings.defaultModel || DEFAULT_MODEL_AUTO_VALUE}
                    onValueChange={handleDefaultModelChange}
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue
                        placeholder={
                          language === "zh"
                            ? "使用列表首个模型"
                            : "Use first available"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_MODEL_AUTO_VALUE}>
                        {language === "zh"
                          ? "使用列表首个模型"
                          : "Use first available"}
                      </SelectItem>
                      {defaultModelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* BYOK Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {t("settings.byok")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.byokDescription")}
                    </p>
                  </div>
                  <div className="ml-6">
                    <Switch
                      checked={settings.byokEnabled || false}
                      onCheckedChange={handleToggleByok}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Configuration - Only show when BYOK is enabled */}
            {settings.byokEnabled && (
              <Card className="overflow-hidden">
                <div className="flex" style={{ minHeight: "500px" }}>
                  {/* Left Sidebar - Custom Model List */}
                  <div className="w-72 border-r flex flex-col">
                    {/* Search + Add */}
                    <div className="p-3 border-b space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={searchTerm}
                          placeholder={t("settings.searchProviders")}
                          className="pl-9"
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleAddModel}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === "zh" ? "新增模型" : "Add Model"}
                      </Button>
                    </div>

                    {/* Model List */}
                    <div className="flex-1 overflow-y-auto">
                      {filteredModels.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground space-y-3">
                          <Search className="w-12 h-12 mx-auto text-muted-foreground" />
                          <p className="text-sm">
                            {t("settings.noProvidersFound")}
                          </p>
                          <Button size="sm" onClick={handleAddModel}>
                            {language === "zh" ? "创建模型" : "Create model"}
                          </Button>
                        </div>
                      ) : (
                        filteredModels.map((model) => {
                          const providerKey = resolveProviderKey(model);
                          const provider = AI_PROVIDERS[providerKey];
                          const isSelected = selectedModelId === model.id;
                          const displayName =
                            model.name?.trim() ||
                            model.aiModel ||
                            provider.name ||
                            t("settings.aiModel");

                          return (
                            <div
                              key={model.id}
                              className={cn(
                                "flex items-center group border-b border-border/40",
                                isSelected ? "bg-primary/5" : "",
                              )}
                            >
                              <Button
                                variant="ghost"
                                onClick={() => handleSelectModel(model.id)}
                                className={cn(
                                  "w-full justify-start h-auto p-4 border-l-2 rounded-none text-left",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-transparent",
                                )}
                              >
                                <div className="flex items-center w-full gap-3">
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                                      isSelected ? "bg-primary/10" : "bg-muted",
                                    )}
                                  >
                                    {provider.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {displayName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {provider.name}
                                    </div>
                                  </div>
                                  {model.enabled && (
                                    <Badge variant="default">
                                      {t("settings.current")}
                                    </Badge>
                                  )}
                                </div>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteModel(model.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Panel - Configuration Details */}
                  <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b">
                      <div className="flex items-center justify-between">
                        {selectedModel ? (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-3xl">
                                {selectedProviderMeta.icon}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold">
                                  {selectedModel.name?.trim() ||
                                    selectedModel.aiModel ||
                                    t("settings.aiModel")}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {selectedProviderMeta.name}
                                </p>
                                {selectedProviderMeta.docs && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    asChild
                                    className="h-auto p-0"
                                  >
                                    <a
                                      href={selectedProviderMeta.docs}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1"
                                    >
                                      {t("settings.getApiKey")}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {language === "zh" ? "启用" : "Enable"}
                              </span>
                              <Switch
                                checked={selectedModel.enabled}
                                onCheckedChange={(checked) =>
                                  handleModelFieldChange("enabled", checked)
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">
                            {language === "zh"
                              ? "选择或创建一个模型以开始配置"
                              : "Select or create a model to configure"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {selectedModel ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="modelName">
                              {language === "zh" ? "展示名称" : "Display Name"}
                            </Label>
                            <Input
                              id="modelName"
                              type="text"
                              value={selectedModel.name || ""}
                              onChange={(e) =>
                                handleModelFieldChange("name", e.target.value)
                              }
                              placeholder={
                                language === "zh"
                                  ? "可选，用于下拉展示"
                                  : "Optional display name"
                              }
                            />
                          </div>

                          {/* Provider Type */}
                          <div className="space-y-2">
                            <Label>
                              {language === "zh"
                                ? "Provider 类型"
                                : "Provider Type"}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Select
                              value={selectedModel.providerType}
                              onValueChange={(value: ProviderType) =>
                                handleModelFieldChange("providerType", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="claude">Claude</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* API Host */}
                          <div className="space-y-2">
                            <Label htmlFor="aiHost">
                              {t("settings.aiHost")}
                            </Label>
                            <Input
                              id="aiHost"
                              type="url"
                              value={selectedModel.aiHost || ""}
                              onChange={(e) =>
                                handleModelFieldChange("aiHost", e.target.value)
                              }
                              placeholder={
                                "host" in selectedProviderMeta
                                  ? (selectedProviderMeta.host ?? "")
                                  : ""
                              }
                            />
                          </div>

                          {/* API Token */}
                          <div className="space-y-2">
                            <Label htmlFor="aiToken">
                              {t("settings.aiToken")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <div className="relative">
                              <Input
                                id="aiToken"
                                type={showToken ? "text" : "password"}
                                value={selectedModel.aiToken || ""}
                                onChange={(e) =>
                                  handleModelFieldChange(
                                    "aiToken",
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  selectedProviderMeta.tokenPlaceholder
                                }
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              >
                                {showToken ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Model Selection */}
                          <div className="space-y-2">
                            <Label htmlFor="aiModel">
                              {t("settings.aiModel")}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Input
                              id="aiModel"
                              type="text"
                              value={selectedModel.aiModel || ""}
                              onChange={(e) =>
                                handleModelFieldChange(
                                  "aiModel",
                                  e.target.value,
                                )
                              }
                              placeholder={t("settings.modelPlaceholder")}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-12">
                          {language === "zh"
                            ? "左侧选择或创建模型以配置"
                            : "Select or create a model on the left to configure"}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Footer */}
                    <div className="p-6 border-t bg-muted/50">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={isTesting || !canTest}
                          className="flex-1"
                        >
                          {isTesting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                              {t("settings.testing")}
                            </>
                          ) : (
                            t("settings.testConnection")
                          )}
                        </Button>

                        <Button
                          onClick={handleSaveSettings}
                          disabled={isSaving || !canSave}
                          className="flex-1"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              {t("common.saving")}
                            </>
                          ) : (
                            t("common.save")
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleReset}
                          disabled={isSaving}
                        >
                          {t("settings.reset")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export type { SettingsPageProps } from "./types";
