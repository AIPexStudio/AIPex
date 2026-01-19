import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@aipexstudio/aipex-react/components/ui/card";
import { Switch } from "@aipexstudio/aipex-react/components/ui/switch";
import { Download, Eye, Settings, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { SkillClient, SkillMetadata } from "./types";

interface SkillCardProps {
  skill: SkillMetadata;
  skillClient: SkillClient;
  onToggleEnabled: (skillId: string, enabled: boolean) => void;
  onDelete: (skillId: string) => void;
  onViewDetails: (skill: SkillMetadata) => void;
  onExport: (skill: SkillMetadata) => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  skillClient,
  onToggleEnabled,
  onDelete,
  onViewDetails,
  onExport,
}) => {
  const isBuiltin = skill.id === "skill-creator";
  const [fileStats, setFileStats] = useState({
    scripts: 0,
    references: 0,
    assets: 0,
  });

  const handleToggleEnabled = (checked: boolean) => {
    if (isBuiltin) {
      alert(
        "Cannot disable built-in skill-creator. This skill is required for the system to function.",
      );
      return;
    }
    onToggleEnabled(skill.id, checked);
  };

  const handleDelete = () => {
    if (isBuiltin) {
      alert(
        "Cannot delete built-in skill-creator. This skill is required for the system to function.",
      );
      return;
    }
    if (confirm(`Are you sure you want to delete the skill "${skill.name}"?`)) {
      onDelete(skill.id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Load file statistics
  useEffect(() => {
    const loadFileStats = async () => {
      try {
        const detail = await skillClient.getSkill(skill.id);
        if (detail) {
          setFileStats({
            scripts: detail.scripts.length,
            references: detail.references.length,
            assets: detail.assets.length,
          });
        }
      } catch (error) {
        console.error(
          `Failed to load file stats for skill ${skill.id}:`,
          error,
        );
        // Keep default stats of 0 if loading fails
      }
    };

    loadFileStats();
  }, [skill.id, skillClient]);

  const stats = fileStats;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="text-center">
          <CardTitle className="text-xl font-bold">{skill.name}</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed">
            {skill.description}
          </CardDescription>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3">
          {isBuiltin && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Built-in
            </Badge>
          )}
          <Badge variant={skill.enabled ? "default" : "secondary"}>
            {skill.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Switch
            checked={skill.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isBuiltin}
            className="ml-2"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Statistics */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground text-center">
              File Statistics
            </div>
            <div className="space-y-2 text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-2">
                <Settings className="h-4 w-4" />
                <span>{stats.scripts} scripts</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{stats.references} references</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                <span>{stats.assets} assets</span>
              </div>
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground text-center">
              Metadata
            </div>
            <div className="space-y-2 text-sm text-muted-foreground text-center">
              <div>Version: {skill.version}</div>
              <div>Uploaded: {formatDate(skill.uploadedAt)}</div>
              <div>Status: {skill.enabled ? "Active" : "Inactive"}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 mt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(skill)}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>

          <Button variant="outline" size="sm" onClick={() => onExport(skill)}>
            <Download className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isBuiltin}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
