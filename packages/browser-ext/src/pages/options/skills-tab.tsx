/**
 * Skills Options Tab
 *
 * Container component for the Skills management UI in the Options page.
 * Uses local skill UI components with sub-tabs for Skills Management and File System.
 */

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@aipexstudio/aipex-react/components/ui/tabs";
import { Puzzle, Search } from "lucide-react";
import { useCallback, useState } from "react";
import {
  SkillList,
  type SkillMetadata,
  SkillUploader,
} from "../../components/skill";
import { skillClientAdapter } from "../../lib/skill-client-adapter";
import { FileExplorerWrapper } from "./file-explorer-wrapper";

export function SkillsOptionsTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [skillsSubTab, setSkillsSubTab] = useState<"skills" | "files">(
    "skills",
  );

  const handleUploadSuccess = useCallback((skill: SkillMetadata) => {
    console.log("Skill uploaded successfully:", skill.name);
    // Trigger refresh of skill list
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error("Skill upload error:", error);
  }, []);

  const handleSkillUpdate = useCallback(() => {
    // Trigger refresh of skill list
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Skills */}
      <Tabs
        value={skillsSubTab}
        onValueChange={(value: string) =>
          setSkillsSubTab(value as "skills" | "files")
        }
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Skills Management
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            File System
          </TabsTrigger>
        </TabsList>

        {/* Skills Management Sub-tab */}
        <TabsContent value="skills" className="space-y-6">
          {/* Upload Section */}
          <SkillUploader
            skillClient={skillClientAdapter}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />

          {/* Skills List */}
          <SkillList
            key={refreshKey}
            skillClient={skillClientAdapter}
            onSkillUpdate={handleSkillUpdate}
          />
        </TabsContent>

        {/* File System Sub-tab */}
        <TabsContent value="files">
          <FileExplorerWrapper />
        </TabsContent>
      </Tabs>
    </div>
  );
}
