"use client";

import React, { ReactElement, useReducer, useState } from "react";
import {
  BankFilled,
  BuildFilled,
  CaretRightFilled,
  CloseSquareFilled,
  EditFilled,
  FileMarkdownFilled,
  FormOutlined,
  PayCircleFilled,
  PlusCircleFilled,
  RocketFilled,
  ToolFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import { uuidv4 } from "@walletconnect/utils";
import { Button, Card, Col, Divider, Flex, Form, FormInstance, Row, Tag, message } from "antd";
import type { NextPage } from "next";
import { erc20Abi } from "viem";
import CustomActionForm from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import ProposalTextForm from "~~/components/proposal/ProposalTextForm";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";
import deployedContracts from "~~/contracts/deployedContracts";

type ProposalAction = {
  key: string;
  name: string;
  abi: any[];
  address: string;
  method: string;
  args: any[];
  value: bigint;
};

type ProposalPresentation = {
  key: string;
  icon: ReactElement;
  name: string;
  form: ReactElement;
};

// const selectActions: ProposalAction[] = [];
const proposalPresentations: ProposalPresentation[] = [
  {
    key: "1",
    icon: <BankFilled style={{ fontSize: "x-large" }} />,
    name: "Governor Settings",
    form: (
      <GovernorSettingsForm
        onChange={(e: any) => {
          console.log(e);
        }}
      />
    ),
  },
  {
    key: "2",
    icon: <ToolFilled style={{ fontSize: "x-large" }} />,
    name: "Chain System Change",
    form: (
      <GovernorSettingsForm
        onChange={(e: any) => {
          console.log(e);
        }}
      />
    ),
  },
  {
    key: "3",
    icon: <PayCircleFilled style={{ fontSize: "x-large" }} />,
    name: "Transfer Token",
    form: (
      <TransferTokenForm
        onChange={(e: any) => {
          console.log(e);
        }}
      />
    ),
  },
  {
    key: "4",
    icon: <BuildFilled style={{ fontSize: "x-large" }} />,
    name: "Custom Action",
    form: (
      <CustomActionForm
        onChange={(e: any) => {
          console.log(e);
        }}
      />
    ),
  },
];

const buttonStyle: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: "medium",
  width: "400px",
  height: "60px",
  justifyContent: "left",
};

type ProposalStorage = {
  proposalText: {
    title: string;
    description: string;
  };
  actions: ProposalAction[];
};

const ProposalCreation: NextPage = () => {
  const [form] = Form.useForm<ProposalStorage>();
  const formRef = React.createRef<FormInstance>();
  const actionsReducer = (state: ProposalAction[], task: { type: string; name: string; key: string }) => {
    switch (task.type) {
      case "add": {
        const action: ProposalAction = {
          key: task.key,
          name: task.name,
          abi: [],
          address: "",
          method: "",
          args: [],
          value: BigInt(0),
        };
        switch (task.name) {
          case "Governor Settings": {
            // action.abi = [...deployedContracts["30303"].BCOSGovernor.abi];
            // action.address = deployedContracts["30303"].BCOSGovernor.address;
            break;
          }
          case "Chain System Change":
            break;
          case "Transfer Token":
            action.abi = [...erc20Abi];
            action.method = "transfer";
            break;
          case "Custom Action":
            break;
        }
        return [...state, action];
      }
      case "remove":
        return state.filter(a => a.key !== task.key);
      default:
        return state;
    }
  };
  const [actions, dispatch] = useReducer(actionsReducer, []);
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedButton, setSelectedButton] = useState<{ page: string; key: string }>({
    page: "proposal-text",
    key: "",
  });
  const [presentActions, setPresentActions] = useState<ProposalPresentation[]>([]);
  return (
    <main className="container mx-auto w-full px-4 py-6">
      <div className="flex justify-between">
        <div className="inline-grid grid-cols-2 gap-4">
          <Button icon={<EditFilled />} size="large" color="default" variant="filled">
            Edit
          </Button>
          <Button icon={<CaretRightFilled />} size="large" color="default" variant="filled">
            Preview
          </Button>
        </div>
        <div className="inline-grid grid-cols-2 gap-4">
          <Button icon={<FormOutlined />} size="large" color="default" variant="filled">
            Save Draft
          </Button>
          <Button
            icon={<RocketFilled />}
            size="large"
            color="primary"
            variant="filled"
            ghost
            htmlType={"submit"}
            onClick={() => {
              const formValue = formRef?.current?.getFieldValue(true) || {};
              form.submit();
              console.log(formValue);
            }}
          >
            Submit
          </Button>
        </div>
      </div>
      <Divider />
      <Row>
        {contextHolder}
        <Col span={6}>
          <div className="w-11/12 grid grid-cols-1 gap-4">
            <Button
              block
              icon={<FileMarkdownFilled style={{ fontSize: "x-large" }} />}
              color={selectedButton.page === "proposal-text" ? "primary" : "default"}
              variant={selectedButton.page === "proposal-text" ? "outlined" : "filled"}
              style={{
                justifyContent: "flex-start",
                fontWeight: "bold",
                fontSize: "medium",
                height: "60px",
              }}
              size="large"
              key={"proposal-text"}
              onClick={() => setSelectedButton({ page: "proposal-text", key: "" })}
            >
              Proposal Text
            </Button>
            {/*Select Actions Buttons*/}
            {presentActions.map(action => (
              <Button
                key={action.key}
                block
                icon={action.icon}
                color={selectedButton.page === action.name && selectedButton.key === action.key ? "primary" : "default"}
                variant={
                  selectedButton.page === action.name && selectedButton.key === action.key ? "outlined" : "filled"
                }
                size="large"
                style={{
                  justifyContent: "flex-start",
                  fontWeight: "bold",
                  fontSize: "medium",
                  height: "60px",
                }}
                onClick={() => setSelectedButton({ page: action.name, key: action.key })}
              >
                {action.name}
              </Button>
            ))}
            <Button
              block
              icon={<PlusCircleFilled />}
              color={selectedButton.page === "add-action" ? "primary" : "default"}
              variant={selectedButton.page === "add-action" ? "outlined" : "filled"}
              size="large"
              key={"add-action"}
              style={{
                fontWeight: "bold",
                fontSize: "medium",
                height: "60px",
              }}
              onClick={() => setSelectedButton({ page: "add-action", key: "" })}
            >
              Add action
            </Button>
          </div>
        </Col>
        {/*Forms Section*/}
        <Col span={18}>
          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={values => {
              console.log("FFFFFFF", values);
            }}
            initialValues={{
              proposalText: {
                title: "",
                description: "",
              },
            }}
          >
            {selectedButton.page === "proposal-text" && (
              <ProposalTextForm
                proposalText={form.getFieldValue("proposalText")}
                onProposalTextChange={(body: any) => {
                  const proposalText = form.getFieldValue("proposalText");
                  form.setFieldValue("proposalText", { ...proposalText, body });
                }}
              />
            )}
            {selectedButton.page === "add-action" && (
              <>
                <div className="flex justify-between mb-4">
                  <div className="inline-grid grid-cols-1 gap-4">
                    <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
                      Action #{presentActions.length + 1}
                    </Tag>
                  </div>
                  <div className="inline-grid grid-cols-1 gap-4">
                    <Button
                      size="large"
                      icon={<CloseSquareFilled />}
                      color="default"
                      variant="filled"
                      onClick={() => {
                        setSelectedButton({ page: "proposal-text", key: "" });
                      }}
                    >
                      Remove action
                    </Button>
                  </div>
                </div>
                <div className="">
                  <Card variant="borderless" type="inner" className="mb-3">
                    <Flex vertical gap="large">
                      {proposalPresentations.map(action => (
                        <Button
                          key={action.key}
                          icon={action.icon}
                          color="default"
                          style={buttonStyle}
                          size="large"
                          onClick={() => {
                            const key = uuidv4();
                            dispatch({
                              type: "add",
                              name: action.name,
                              key: key,
                            });
                            if (presentActions.length >= 10) {
                              messageApi.warning("You can only add up to 10 actions");
                              return;
                            }
                            const newPresentAction = {
                              ...action,
                              key: key,
                            };
                            setPresentActions([...presentActions, newPresentAction]);
                          }}
                        >
                          {action.name}
                        </Button>
                      ))}
                    </Flex>
                  </Card>
                </div>
              </>
            )}
            {presentActions.map((action, index) => {
              if (selectedButton.page === action.name && selectedButton.key === action.key) {
                return (
                  <div key={selectedButton.key}>
                    <div className="flex justify-between mb-4">
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Tag color="blue" bordered={false} className="text-lg font-bold content-center">
                          Action #{index + 1}
                        </Tag>
                      </div>
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Button
                          size="large"
                          icon={<CloseSquareFilled />}
                          color="default"
                          variant="filled"
                          onClick={() => {
                            dispatch({
                              type: "remove",
                              key: action.key,
                              name: action.name,
                            });
                            const newActions = presentActions.filter(a => a.key !== action.key);
                            setPresentActions(newActions);
                            if (index === 0) {
                              setSelectedButton({ page: "proposal-text", key: "" });
                            } else {
                              setSelectedButton({
                                page: presentActions[index - 1].name,
                                key: presentActions[index - 1].key,
                              });
                            }
                          }}
                        >
                          Remove action
                        </Button>
                      </div>
                    </div>
                    {action.form}
                  </div>
                );
              }
            })}
          </Form>
        </Col>
      </Row>
    </main>
  );
};

export default ProposalCreation;
