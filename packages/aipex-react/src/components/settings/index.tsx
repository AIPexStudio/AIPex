import {
  AI_PROVIDERS,
  type AIProviderKey,
  detectProviderFromHost,
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
  Search,
  Settings,
  Twitter,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/context";
import { cn } from "../../lib/utils";
import { useTheme } from "../../theme/context";
import type { ChatSettings } from "../../types";
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
import type {
  ProviderConfigs,
  SaveStatus,
  SettingsPageProps,
  SettingsTab,
} from "./types";

function createInitialProviderConfigs(): ProviderConfigs {
  const configs = {} as ProviderConfigs;
  for (const key of Object.keys(AI_PROVIDERS) as AIProviderKey[]) {
    const provider = AI_PROVIDERS[key];
    configs[key] = {
      host: provider.host,
      token: "",
      model: provider.models[0] || "",
    };
  }
  return configs;
}

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

  const [settings, setSettings] = useState<ChatSettings>({});
  const [selectedProvider, setSelectedProvider] =
    useState<AIProviderKey>("custom");
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
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>(
    createInitialProviderConfigs,
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await storageAdapter.load(storageKey);
        if (result) {
          const loadedSettings = result as ChatSettings;
          setSettings(loadedSettings);

          const loadedDataSharing =
            loadedSettings.dataSharingEnabled !== undefined
              ? loadedSettings.dataSharingEnabled
              : true;
          setDataSharingEnabled(loadedDataSharing);

          let detectedProvider: AIProviderKey = "custom";
          if (loadedSettings.aiHost) {
            detectedProvider = detectProviderFromHost(loadedSettings.aiHost);
          }
          setSelectedProvider(detectedProvider);

          setProviderConfigs((prev: ProviderConfigs) => ({
            ...prev,
            [detectedProvider]: {
              host: loadedSettings.aiHost || "",
              token: loadedSettings.aiToken || "",
              model: loadedSettings.aiModel || "",
            },
          }));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [storageAdapter, storageKey]);

  const handleProviderChange = useCallback(
    (provider: AIProviderKey) => {
      setProviderConfigs((prev: ProviderConfigs) => ({
        ...prev,
        [selectedProvider]: {
          host: settings.aiHost || "",
          token: settings.aiToken || "",
          model: settings.aiModel || "",
        },
      }));

      setSelectedProvider(provider);

      const savedConfig = providerConfigs[provider];
      setSettings((prev: ChatSettings) => ({
        ...prev,
        aiHost: savedConfig.host,
        aiToken: savedConfig.token,
        aiModel: savedConfig.model,
      }));
    },
    [selectedProvider, settings, providerConfigs],
  );

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus({ type: "", message: "" });

    if (settings.byokEnabled) {
      if (!settings.aiHost || !settings.aiToken || !settings.aiModel) {
        setSaveStatus({
          type: "error",
          message:
            language === "zh"
              ? "请填写所有必填字段"
              : "Please fill in all required fields",
        });
        setIsSaving(false);
        return;
      }
    }

    try {
      const settingsToSave = {
        ...settings,
        dataSharingEnabled,
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
    dataSharingEnabled,
    storageAdapter,
    storageKey,
    onSave,
    language,
    t,
  ]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setSaveStatus({ type: "", message: "" });

    try {
      if (onTestConnection) {
        const success = await onTestConnection(settings);
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
        // Default test implementation
        if (selectedProvider === "anthropic") {
          const response = await fetch(settings.aiHost || "", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": settings.aiToken || "",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: settings.aiModel,
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        } else {
          const response = await fetch(settings.aiHost || "", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.aiToken}`,
              "x-api-key": settings.aiToken || "",
            },
            body: JSON.stringify({
              model: settings.aiModel,
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg =
              errorData.error?.message ||
              errorData.message ||
              `HTTP ${response.status}`;
            throw new Error(errorMsg);
          }
        }

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
  }, [settings, selectedProvider, onTestConnection, t]);

  const handleReset = useCallback(() => {
    if (confirm(t("settings.resetConfirm"))) {
      setProviderConfigs(createInitialProviderConfigs());
      setSettings({});
      setSelectedProvider("custom");
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

  const filteredProviders = (
    Object.keys(AI_PROVIDERS) as AIProviderKey[]
  ).filter((key) => {
    const provider = AI_PROVIDERS[key];
    return provider.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, byokEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Configuration - Only show when BYOK is enabled */}
            {settings.byokEnabled && (
              <Card className="overflow-hidden">
                <div className="flex" style={{ minHeight: "500px" }}>
                  {/* Left Sidebar - Provider List */}
                  <div className="w-64 border-r flex flex-col">
                    {/* Search Bar */}
                    <div className="p-3 border-b">
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
                    </div>

                    {/* Provider List */}
                    <div className="flex-1 overflow-y-auto">
                      {filteredProviders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm">
                            {t("settings.noProvidersFound")}
                          </p>
                        </div>
                      ) : (
                        filteredProviders.map((key) => {
                          const provider = AI_PROVIDERS[key];
                          const isSelected = selectedProvider === key;

                          return (
                            <Button
                              key={key}
                              variant="ghost"
                              onClick={() => handleProviderChange(key)}
                              className={cn(
                                "w-full justify-start h-auto p-4 border-l-2 rounded-none",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-lg mr-3",
                                  isSelected ? "bg-primary/10" : "bg-muted",
                                )}
                              >
                                {provider.icon}
                              </div>

                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium">
                                  {provider.name}
                                </div>
                              </div>

                              {isSelected && (
                                <Badge variant="default" className="ml-2">
                                  {t("settings.current")}
                                </Badge>
                              )}
                            </Button>
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
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-3xl">
                            {AI_PROVIDERS[selectedProvider].icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">
                              {AI_PROVIDERS[selectedProvider].name}
                            </h3>
                            {selectedProvider !== "custom" &&
                              AI_PROVIDERS[selectedProvider].docs && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  asChild
                                  className="h-auto p-0"
                                >
                                  <a
                                    href={AI_PROVIDERS[selectedProvider].docs}
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
                      </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* API Host */}
                      <div className="space-y-2">
                        <Label htmlFor="aiHost">
                          {t("settings.aiHost")}
                          <span className="text-destructive ml-1">*</span>
                        </Label>
                        <Input
                          id="aiHost"
                          type="url"
                          value={settings.aiHost || ""}
                          onChange={(e) =>
                            setSettings({ ...settings, aiHost: e.target.value })
                          }
                          placeholder={AI_PROVIDERS[selectedProvider].host}
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
                            value={settings.aiToken || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                aiToken: e.target.value,
                              })
                            }
                            placeholder={
                              AI_PROVIDERS[selectedProvider].tokenPlaceholder
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
                        {AI_PROVIDERS[selectedProvider].models.length > 0 ? (
                          <Select
                            value={settings.aiModel || ""}
                            onValueChange={(value: string) =>
                              setSettings({ ...settings, aiModel: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  language === "zh"
                                    ? "选择模型"
                                    : "Select a model"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {AI_PROVIDERS[selectedProvider].models.map(
                                (model: string) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="aiModel"
                            type="text"
                            value={settings.aiModel || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                aiModel: e.target.value,
                              })
                            }
                            placeholder={t("settings.modelPlaceholder")}
                          />
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Footer */}
                    <div className="p-6 border-t bg-muted/50">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={
                            isTesting ||
                            !settings.aiHost ||
                            !settings.aiToken ||
                            !settings.aiModel
                          }
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
                          disabled={
                            isSaving ||
                            !settings.aiHost ||
                            !settings.aiToken ||
                            !settings.aiModel
                          }
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
