import { ParentClosePolicy, WorkflowIdReusePolicy, startChild } from "@temporalio/workflow";
import { importDocmap } from "../workflows";
import { DocMapHashes } from "../types";

export const createImportDocmapWorkflow = async (docMapIdHash: DocMapHashes) => {
    return startChild(importDocmap, {
        args: [docMapIdHash.docMapId], // id contains the canonical URL of the docmap
        workflowId: `docmap-${docMapIdHash.docMapIdHash}`,
        // allows child workflows to outlive this workflow
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
        // makes sure there is only one workflow running, this new one.
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_TERMINATE_IF_RUNNING,
        taskQueue: 'import-docmaps',
      });
}