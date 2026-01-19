import { Code, Download, Eye, FileText } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
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
import type { SkillClient, SkillMetadata } from "./types";

interface SkillDetailsProps {
  skill: SkillMetadata | null;
  skillClient: SkillClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SkillDetails: React.FC<SkillDetailsProps> = ({
  skill,
  skillClient,
  open,
  onOpenChange,
}) => {
  const [skillContent, setSkillContent] = useState<string>("");
  const [scripts, setScripts] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSkillDetails = useCallback(async () => {
    if (!skill) return;

    setLoading(true);
    try {
      // Load skill details via adapter
      const skillData = await skillClient.getSkill(skill.name);

      if (skillData) {
        setSkillContent(skillData.skillMdContent);
        
        // For now, just set the file paths - in a full implementation,
        // we'd load the actual content
        setScripts(skillData.scripts.map(s => `// Script: ${s}\n// (content not loaded)`));
        setReferences(skillData.references.map(r => `# Reference: ${r}\n(content not loaded)`));
        setAssets(skillData.assets);
      }
    } catch (error) {
      console.error("Failed to load skill details:", error);
    } finally {
      setLoading(false);
    }
  }, [skill, skillClient]);

  useEffect(() => {
    if (skill && open) {
      loadSkillDetails();
    }
  }, [skill, open, loadSkillDetails]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                Scripts ({scripts.length})
              </TabsTrigger>
              <TabsTrigger
                value="references"
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                References ({references.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Assets ({assets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="content"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-2 flex-1 overflow-y-auto">
                <div className="text-sm font-medium">SKILL.md</div>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                  {loading ? "Loading..." : skillContent}
                </pre>
              </div>
            </TabsContent>

            <TabsContent
              value="scripts"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-4 overflow-y-auto flex-1">
                {scripts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No scripts found
                  </div>
                ) : (
                  scripts.map((script, index) => (
                    <div key={index} className="space-y-2">
                      <div className="text-sm font-medium">
                        Script {index + 1}
                      </div>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-[60vh]">
                        {script}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="references"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="space-y-4 overflow-y-auto flex-1">
                {references.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No references found
                  </div>
                ) : (
                  references.map((reference, index) => (
                    <div key={index} className="space-y-2">
                      <div className="text-sm font-medium">
                        Reference {index + 1}
                      </div>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-[60vh]">
                        {reference}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

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
                  assets.map((asset, index) => (
                    <div
                      key={index}
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
