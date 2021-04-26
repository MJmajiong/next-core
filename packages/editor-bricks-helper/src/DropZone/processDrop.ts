import {
  BuilderDataTransferPayloadOfNodeToAdd,
  BuilderDataTransferPayloadOfNodeToMove,
  BuilderDataTransferType,
  BuilderGroupedChildNode,
  BuilderRuntimeNode,
} from "../interfaces";
import { BuilderDataManager } from "../internal/BuilderDataManager";
import { getUniqueNodeId } from "../internal/getUniqueNodeId";
import { getSortedIdsAfterDropped } from "../processors/getSortedIdsAfterDropped";

export interface HandleDropParams {
  manager: BuilderDataManager;
  type: BuilderDataTransferType;
  data:
    | BuilderDataTransferPayloadOfNodeToAdd
    | BuilderDataTransferPayloadOfNodeToMove;
  droppingIndex: number;
  droppingParentUid: number;
  droppingParentInstanceId: string;
  droppingMountPoint: string;
  droppingChildNodes: BuilderRuntimeNode[];
  droppingSiblingGroups: BuilderGroupedChildNode[];
  isPortalCanvas?: boolean;
}

export function processDrop({
  manager,
  type,
  data,
  droppingIndex,
  droppingParentUid,
  droppingParentInstanceId,
  droppingMountPoint,
  droppingChildNodes,
  droppingSiblingGroups,
  isPortalCanvas,
}: HandleDropParams): void {
  if (type === BuilderDataTransferType.NODE_TO_ADD) {
    // Drag a new node into canvas.
    const {
      brickType = "brick",
      brick,
    } = data as BuilderDataTransferPayloadOfNodeToAdd;
    const draggingNodeUid = getUniqueNodeId();
    manager.nodeAdd({
      ...getSortedIdsAfterDropped({
        draggingNodeUid,
        draggingNodeId: null,
        droppingIndex,
        droppingMountPoint,
        droppingSiblingGroups,
      }),
      nodeUid: draggingNodeUid,
      parentUid: droppingParentUid,
      nodeAlias: brick.split(".").pop(),
      nodeData: {
        parent: droppingParentInstanceId,
        type: brickType,
        brick,
        mountPoint: droppingMountPoint,
        bg: !isPortalCanvas && brickType === "provider" ? true : undefined,
        portal: isPortalCanvas,
      },
    });
  } else if (type === BuilderDataTransferType.NODE_TO_MOVE) {
    const {
      nodeUid: draggingNodeUid,
      nodeId: draggingNodeId,
      nodeInstanceId: draggingNodeInstanceId,
    } = data as BuilderDataTransferPayloadOfNodeToMove;

    const draggingIndex = droppingChildNodes.findIndex(
      (item) => item.$$uid === draggingNodeUid
    );
    // If found dragging node in the same drop zone,
    // then apply a node reorder, otherwise apply a node move.
    if (draggingIndex >= 0) {
      // If the index is not changed, then there is nothing to do.
      if (
        droppingIndex !== draggingIndex &&
        droppingIndex !== draggingIndex + 1
      ) {
        manager.nodeReorder({
          ...getSortedIdsAfterDropped({
            draggingNodeUid,
            draggingNodeId,
            draggingIndex,
            droppingIndex,
            droppingMountPoint,
            droppingSiblingGroups,
          }),
          parentUid: droppingParentUid,
        });
      }
    } else {
      manager.nodeMove({
        ...getSortedIdsAfterDropped({
          draggingNodeUid,
          draggingNodeId,
          droppingIndex,
          droppingMountPoint,
          droppingSiblingGroups,
        }),
        nodeUid: draggingNodeUid,
        parentUid: droppingParentUid,
        nodeInstanceId: draggingNodeInstanceId,
        nodeData: {
          parent: droppingParentInstanceId,
          mountPoint: droppingMountPoint,
        },
      });
    }
  }
}
