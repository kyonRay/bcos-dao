import { CaretRightFilled, EditFilled, FormOutlined, RocketFilled } from "@ant-design/icons";
import { Button } from "antd";
import type { NextPage } from "next";

const ProposalCreation: NextPage = () => {
  return (
    <main className="container mx-auto w-full px-4 py-6">
      <div className="flex justify-between">
        <div>
          <Button icon={<EditFilled />}>Edit</Button>
          <Button icon={<CaretRightFilled />}>Preview</Button>
        </div>
        <div>
          <Button icon={<FormOutlined />}>Save Draft</Button>
          <Button icon={<RocketFilled />} type="primary">
            Submit
          </Button>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="w-2/3"></div>
      </div>
    </main>
  );
};

export default ProposalCreation;
