import React from "react";
import { shallow } from "enzyme";
import { range } from "lodash";
import { useBuilderNodeMountPoints } from "./useBuilderNodeMountPoints";
import { useBuilderData } from "./useBuilderData";
import { BuilderRuntimeNode } from "../interfaces";

jest.mock("./useBuilderData");

// Given a tree:
// - 1:
//   - toolbar:
//     - 2
//   - content:
//     - 3
//       - content
//         - 5
//           - <template-internal>
//             - 6
//           - items
//             - 7
//     - 4
(useBuilderData as jest.MockedFunction<typeof useBuilderData>).mockReturnValue({
  rootId: 1,
  nodes: range(1, 8).map(
    ($$uid) =>
      ({
        $$uid,
      } as Partial<BuilderRuntimeNode> as BuilderRuntimeNode)
  ),
  edges: [
    {
      parent: 1,
      child: 2,
      mountPoint: "toolbar",
      sort: 0,
    },
    {
      parent: 1,
      child: 3,
      mountPoint: "content",
      sort: 1,
    },
    {
      parent: 1,
      child: 4,
      mountPoint: "content",
      sort: 2,
    },
    {
      parent: 3,
      child: 5,
      mountPoint: "content",
      sort: 0,
    },
    {
      parent: 5,
      child: 6,
      mountPoint: "<internal>",
      sort: 0,
      $$isTemplateInternal: true,
    },
    {
      parent: 5,
      child: 7,
      mountPoint: "items",
      sort: 1,
      $$isTemplateDelegated: true,
    },
  ],
});

function TestComponent(
  props: Parameters<typeof useBuilderNodeMountPoints>[0]
): React.ReactElement {
  const mountPoints = useBuilderNodeMountPoints(props);
  return <div>{mountPoints.join(";")}</div>;
}

describe("useBuilderNodeMountPoints", () => {
  it.each<[Parameters<typeof useBuilderNodeMountPoints>[0], string]>([
    [
      {
        isRoot: true,
      },
      "toolbar;content",
    ],
    [
      {
        nodeUid: 3,
      },
      "content",
    ],
    [
      {
        nodeUid: 5,
      },
      "<internal>",
    ],
    [
      {
        nodeUid: 5,
        doNotExpandTemplates: true,
      },
      "items",
    ],
  ])("should work", (props, stringUid) => {
    const wrapper = shallow(<TestComponent {...props} />);
    expect(wrapper.text()).toBe(stringUid);
  });
});
