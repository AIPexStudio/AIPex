import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@aipexstudio/aipex-react/components/ui/card";
import { Input } from "@aipexstudio/aipex-react/components/ui/input";
import { AlertCircle, Filter, RefreshCw, Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SkillCard } from "./SkillCard";
import { SkillDetails } from "./SkillDetails";
import type { SkillClient, SkillMetadata } from "./types";

interface SkillListProps {
  skillClient: SkillClient;
  onSkillUpdate: () => void;
}

export const SkillList: React.FC<SkillListProps> = ({
  skillClient,
  onSkillUpdate,
}) => {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<SkillMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEnabled, setFilterEnabled] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize skill manager if needed
      if (!skillClient.isInitialized()) {
        await skillClient.initialize();
      }

      const allSkills = skillClient.listSkills();
      setSkills(allSkills);
      setFilteredSkills(allSkills);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, [skillClient]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    // Filter skills based on search query and enabled filter
    let filtered = skills;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query),
      );
    }

    // Apply enabled filter
    if (filterEnabled !== "all") {
      filtered = filtered.filter((skill) =>
        filterEnabled === "enabled" ? skill.enabled : !skill.enabled,
      );
    }

    setFilteredSkills(filtered);
  }, [skills, searchQuery, filterEnabled]);

  const handleToggleEnabled = async (skillId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await skillClient.enableSkill(skillId);
      } else {
        await skillClient.disableSkill(skillId);
      }

      // Reload skills to get updated state
      await loadSkills();
      onSkillUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill");
    }
  };

  const handleDelete = async (skillId: string) => {
    try {
      await skillClient.deleteSkill(skillId);

      // Reload skills
      await loadSkills();
      onSkillUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  const handleViewDetails = (skill: SkillMetadata) => {
    setSelectedSkill(skill);
    setDetailsOpen(true);
  };

  const handleExport = (skill: SkillMetadata) => {
    // TODO: Implement skill export functionality
    console.log("Export skill:", skill.name);
  };

  const getStats = () => {
    const total = skills.length;
    const enabled = skills.filter((s) => s.enabled).length;
    const disabled = total - enabled;

    return { total, enabled, disabled };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading skills...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Installed Skills</CardTitle>
              <CardDescription>
                Manage your AI skills and capabilities
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{stats.total} total</Badge>
              <Badge variant="default">{stats.enabled} enabled</Badge>
              <Badge variant="secondary">{stats.disabled} disabled</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterEnabled === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterEnabled("all")}
              >
                All
              </Button>
              <Button
                variant={filterEnabled === "enabled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterEnabled("enabled")}
              >
                Enabled
              </Button>
              <Button
                variant={filterEnabled === "disabled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterEnabled("disabled")}
              >
                Disabled
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={loadSkills}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No skills found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterEnabled !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Upload your first skill to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              skillClient={skillClient}
              onToggleEnabled={handleToggleEnabled}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      {/* Skill Details Modal */}
      <SkillDetails
        skill={selectedSkill}
        skillClient={skillClient}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};
