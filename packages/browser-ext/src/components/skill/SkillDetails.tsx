import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@aipexstudio/aipex-react/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@aipexstudio/aipex-react/components/ui/tabs";
import { Textarea } from "@aipexstudio/aipex-react/components/ui/textarea";
import {
  AlertCircle,
  Code,
  Download,
  Edit,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Save,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { SkillClient, SkillMetadata } from "./types";

/** Script data with path and loaded content */
interface ScriptData {
  path: string;
  content: string;
}

/** Reference data with path and loaded content */
interface ReferenceData {
  path: string;
  content: string;
}

interface SkillDetailsProps {
  skill: SkillMetadata | null;
  skillClient: SkillClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditInFileManager?: (filePath: string) => void;
  onSkillUpdated?: () => void;
}

export const SkillDetails: React.FC<SkillDetailsProps> = ({
  skill,
  skillClient,
  open,
  onOpenChange,
  onEditInFileManager,
  onSkillUpdated,
}) => {
  const [skillContent, setSkillContent] = useState<string>("");
  const [scriptsData, setScriptsData] = useState<ScriptData[]>([]);
  const [referencesData, setReferencesData] = useState<ReferenceData[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit states
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editingScriptIndex, setEditingScriptIndex] = useState<number | null>(
    null,
  );
  const [editedScriptContent, setEditedScriptContent] = useState("");
  const [editingRefIndex, setEditingRefIndex] = useState<number | null>(null);
  const [editedRefContent, setEditedRefContent] = useState("");

  // Save states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resetEditStates = useCallback(() => {
    setIsEditingContent(false);
    setEditedContent("");
    setEditingScriptIndex(null);
    setEditedScriptContent("");
    setEditingRefIndex(null);
    setEditedRefContent("");
    setSaveError(null);
  }, []);

  const loadSkillDetails = useCallback(async () => {
    if (!skill) return;

    setLoading(true);
    resetEditStates();
    try {
      // Load skill content
      const content = await skillClient.getSkillContent(skill.name);
      setSkillContent(content);

      // Get skill data
      const skillData = await skillClient.getSkill(skill.name);

      if (skillData) {
        // Load scripts with their paths and content
        const scriptDataList: ScriptData[] = [];
        for (const scriptPath of skillData.scripts) {
          try {
            const scriptContent = await skillClient.getSkillScript(
              skill.name,
              scriptPath,
            );
            scriptDataList.push({ path: scriptPath, content: scriptContent });
          } catch (error) {
            console.error(`Failed to load script ${scriptPath}:`, error);
            scriptDataList.push({
              path: scriptPath,
              content: "// Error loading script",
            });
          }
        }
        setScriptsData(scriptDataList);

        // Load references with their paths and content
        const refDataList: ReferenceData[] = [];
        for (const refPath of skillData.references) {
          try {
            const refContent = await skillClient.getSkillReference(
              skill.name,
              refPath,
            );
            refDataList.push({ path: refPath, content: refContent });
          } catch (error) {
            console.error(`Failed to load reference ${refPath}:`, error);
            refDataList.push({
              path: refPath,
              content: "// Error loading reference",
            });
          }
        }
        setReferencesData(refDataList);

        // Set assets
        setAssets(skillData.assets);
      }
    } catch (error) {
      console.error("Failed to load skill details:", error);
    } finally {
      setLoading(false);
    }
  }, [skill, skillClient, resetEditStates]);

  useEffect(() => {
    if (skill && open) {
      loadSkillDetails();
    }
  }, [skill, open, loadSkillDetails]);

  // Reset edit states when dialog closes
  useEffect(() => {
    if (!open) {
      resetEditStates();
    }
  }, [open, resetEditStates]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEditInFileManager = () => {
    if (skill && onEditInFileManager) {
      const skillMdPath = `/skills/${skill.id}/SKILL.md`;
      onOpenChange(false); // Close the details dialog
      onEditInFileManager(skillMdPath);
    }
  };

  // --- SKILL.md Edit Handlers ---
  const handleStartEditContent = () => {
    setEditedContent(skillContent);
    setIsEditingContent(true);
    setSaveError(null);
  };

  const handleCancelEditContent = () => {
    setIsEditingContent(false);
    setEditedContent("");
    setSaveError(null);
  };

  const handleSaveContent = async () => {
    if (!skill) return;

    // Validate name hasn't changed
    const nameMatch = editedContent.match(
      /^---\n[\s\S]*?name:\s*(.+?)[\s]*\n[\s\S]*?---/m,
    );
    const parsedName = nameMatch?.[1]?.trim();

    if (parsedName && parsedName !== skill.id) {
      setSaveError(
        `Cannot rename skill. The name "${parsedName}" must match "${skill.id}". Skill renaming is not supported.`,
      );
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const filePath = `/skills/${skill.id}/SKILL.md`;
      await skillClient.writeFile(filePath, editedContent);

      // Refresh metadata
      try {
        await skillClient.refreshSkillMetadata(skill.id);
      } catch (metadataErr) {
        console.error("Failed to sync skill metadata:", metadataErr);
      }

      // Update local state
      setSkillContent(editedContent);
      setIsEditingContent(false);
      setEditedContent("");

      // Notify parent
      onSkillUpdated?.();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save file";
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // --- Script Edit Handlers ---
  const handleStartEditScript = (index: number) => {
    const script = scriptsData[index];
    if (!script) return;
    setEditedScriptContent(script.content);
    setEditingScriptIndex(index);
    setSaveError(null);
  };

  const handleCancelEditScript = () => {
    setEditingScriptIndex(null);
    setEditedScriptContent("");
    setSaveError(null);
  };

  const handleSaveScript = async () => {
    if (!skill || editingScriptIndex === null) return;

    const scriptData = scriptsData[editingScriptIndex];
    if (!scriptData) return;

    try {
      setSaving(true);
      setSaveError(null);

      const filePath = `/skills/${skill.id}/${scriptData.path}`;
      await skillClient.writeFile(filePath, editedScriptContent);

      // Update local state
      const updatedScripts = [...scriptsData];
      updatedScripts[editingScriptIndex] = {
        ...scriptData,
        content: editedScriptContent,
      };
      setScriptsData(updatedScripts);

      setEditingScriptIndex(null);
      setEditedScriptContent("");

      onSkillUpdated?.();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save script";
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // --- Reference Edit Handlers ---
  const handleStartEditRef = (index: number) => {
    const ref = referencesData[index];
    if (!ref) return;
    setEditedRefContent(ref.content);
    setEditingRefIndex(index);
    setSaveError(null);
  };

  const handleCancelEditRef = () => {
    setEditingRefIndex(null);
    setEditedRefContent("");
    setSaveError(null);
  };

  const handleSaveRef = async () => {
    if (!skill || editingRefIndex === null) return;

    const refData = referencesData[editingRefIndex];
    if (!refData) return;

    try {
      setSaving(true);
      setSaveError(null);

      const filePath = `/skills/${skill.id}/${refData.path}`;
      await skillClient.writeFile(filePath, editedRefContent);

      // Update local state
      const updatedRefs = [...referencesData];
      updatedRefs[editingRefIndex] = {
        ...refData,
        content: editedRefContent,
      };
      setReferencesData(updatedRefs);

      setEditingRefIndex(null);
      setEditedRefContent("");

      onSkillUpdated?.();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save reference";
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!skill) return null;

  const isBuiltin = skill.id === "skill-creator";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-w-full max-h-[90vh] w-[90vw] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {skill.name}
            {isBuiltin && (
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-600"
              >
                Built-in
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Skill Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Description
              </div>
              <div className="text-sm mt-1">{skill.description}</div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Version
                </div>
                <div className="text-sm">{skill.version}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Uploaded
                </div>
                <div className="text-sm">{formatDate(skill.uploadedAt)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Status
                </div>
                <Badge variant={skill.enabled ? "default" : "secondary"}>
                  {skill.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {onEditInFileManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditInFileManager}
                  className="mt-1"
                >
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Edit in File Manager
                </Button>
              )}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs
            defaultValue="content"
            className="w-full flex-1 overflow-hidden flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Content
              </TabsTrigger>
              <TabsTrigger value="scripts" className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                Scripts ({scriptsData.length})
              </TabsTrigger>
              <TabsTrigger
                value="references"
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                References ({referencesData.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Assets ({assets.length})
              </TabsTrigger>
            </TabsList>

            {/* ===== Content (SKILL.md) Tab ===== */}
            <TabsContent
              value="content"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-2 flex-1 overflow-y-auto">
                {isEditingContent ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        SKILL.md (Editing)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditContent}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveContent}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                    {saveError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{saveError}</AlertDescription>
                      </Alert>
                    )}
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="font-mono text-sm min-h-[400px] resize-y flex-1"
                      placeholder="SKILL.md content..."
                      disabled={saving}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">SKILL.md</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditContent}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                      {loading ? "Loading..." : skillContent}
                    </pre>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ===== Scripts Tab ===== */}
            <TabsContent
              value="scripts"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-4 overflow-y-auto flex-1">
                {scriptsData.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No scripts found
                  </div>
                ) : (
                  scriptsData.map((scriptData, index) => (
                    <div key={scriptData.path} className="space-y-2">
                      {editingScriptIndex === index ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {scriptData.path} (Editing)
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditScript}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveScript}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                          {saveError && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{saveError}</AlertDescription>
                            </Alert>
                          )}
                          <Textarea
                            value={editedScriptContent}
                            onChange={(e) =>
                              setEditedScriptContent(e.target.value)
                            }
                            className="font-mono text-sm min-h-[300px] resize-y"
                            placeholder="Script content..."
                            disabled={saving}
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {scriptData.path}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEditScript(index)}
                              disabled={editingScriptIndex !== null}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-[60vh] whitespace-pre-wrap">
                            {scriptData.content}
                          </pre>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ===== References Tab ===== */}
            <TabsContent
              value="references"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-4 overflow-y-auto flex-1">
                {referencesData.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No references found
                  </div>
                ) : (
                  referencesData.map((refData, index) => (
                    <div key={refData.path} className="space-y-2">
                      {editingRefIndex === index ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {refData.path} (Editing)
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditRef}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveRef}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                          {saveError && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{saveError}</AlertDescription>
                            </Alert>
                          )}
                          <Textarea
                            value={editedRefContent}
                            onChange={(e) =>
                              setEditedRefContent(e.target.value)
                            }
                            className="font-mono text-sm min-h-[300px] resize-y"
                            placeholder="Reference content..."
                            disabled={saving}
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {refData.path}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEditRef(index)}
                              disabled={editingRefIndex !== null}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-[60vh] whitespace-pre-wrap">
                            {refData.content}
                          </pre>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ===== Assets Tab ===== */}
            <TabsContent
              value="assets"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-2">
                {assets.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No assets found
                  </div>
                ) : (
                  assets.map((asset) => (
                    <div
                      key={asset}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{asset}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
