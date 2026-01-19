import { Code, Download, Eye, FileText } from "lucide-react"
import React, { useEffect, useState } from "react"

import {
  CodeBlock,
  CodeBlockCopyButton
} from "~/../components/ai-elements/code-block"
import { Badge } from "~/../components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "~/../components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "~/../components/ui/tabs"

import { skillManager } from "../../lib/services/skill-manager"
import { SkillMetadata } from "../../lib/storage/skill-storage"

interface SkillDetailsProps {
  skill: SkillMetadata | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SkillDetails: React.FC<SkillDetailsProps> = ({
  skill,
  open,
  onOpenChange
}) => {
  const [skillContent, setSkillContent] = useState<string>("")
  const [scripts, setScripts] = useState<string[]>([])
  const [references, setReferences] = useState<string[]>([])
  const [assets, setAssets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (skill && open) {
      loadSkillDetails()
    }
  }, [skill, open])

  const loadSkillDetails = async () => {
    if (!skill) return

    setLoading(true)
    try {
      // Load skill content
      const content = await skillManager.getSkillContent(skill.name)
      setSkillContent(content)

      // Get skill data from skill manager (which reads from ZenFS)
      const skillData = await skillManager.getSkill(skill.name)

      if (skillData) {
        // Load scripts
        const scriptContents: string[] = []
        for (const scriptPath of skillData.scripts) {
          try {
            const scriptContent = await skillManager.getSkillScript(
              skill.name,
              scriptPath
            )
            scriptContents.push(`// ${scriptPath}\n${scriptContent}`)
          } catch (error) {
            console.error(`Failed to load script ${scriptPath}:`, error)
            scriptContents.push(`// ${scriptPath}\n// Error loading script`)
          }
        }
        setScripts(scriptContents)

        // Load references
        const refContents: string[] = []
        for (const refPath of skillData.references) {
          try {
            const refContent = await skillManager.getSkillReference(
              skill.name,
              refPath
            )
            refContents.push(`# ${refPath}\n${refContent}`)
          } catch (error) {
            console.error(`Failed to load reference ${refPath}:`, error)
            refContents.push(`# ${refPath}\n// Error loading reference`)
          }
        }
        setReferences(refContents)

        // Set assets
        setAssets(skillData.assets)
      }
    } catch (error) {
      console.error("Failed to load skill details:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (!skill) return null

  const isBuiltin = skill.id === "skill-creator"

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
                className="text-blue-600 border-blue-600">
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
            className="w-full flex-1 overflow-hidden flex flex-col min-h-0">
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
                className="flex items-center gap-1">
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
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="space-y-2 flex-1 overflow-y-auto">
                <div className="text-sm font-medium">SKILL.md</div>
                <div className="max-h-[70vh] w-full overflow-auto">
                  <CodeBlock
                    code={loading ? "Loading..." : skillContent}
                    language="markdown"
                    showLineNumbers={true}
                    className="w-full"
                    style={{ overflow: "visible" }}>
                    <CodeBlockCopyButton />
                  </CodeBlock>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="scripts"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
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
                      <div className="max-h-[60vh] w-full overflow-auto">
                        <CodeBlock
                          code={script}
                          language="javascript"
                          showLineNumbers={true}
                          className="w-full"
                          style={{ overflow: "visible" }}>
                          <CodeBlockCopyButton />
                        </CodeBlock>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="references"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
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
                      <div className="max-h-[60vh] w-full overflow-auto">
                        <CodeBlock
                          code={reference}
                          language="markdown"
                          showLineNumbers={true}
                          className="w-full"
                          style={{ overflow: "visible" }}>
                          <CodeBlockCopyButton />
                        </CodeBlock>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="assets"
              className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="space-y-2">
                {assets.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No assets found
                  </div>
                ) : (
                  assets.map((asset, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{asset}</span>
                      </div>
                      <CodeBlock
                        code={asset}
                        language="text"
                        className="max-w-xs max-h-20 overflow-auto">
                        <CodeBlockCopyButton />
                      </CodeBlock>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
