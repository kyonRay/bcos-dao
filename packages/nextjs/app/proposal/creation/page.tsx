"use client";

import React, { ReactElement, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BankFilled,
  BuildFilled,
  CaretRightFilled,
  CloseSquareFilled,
  EditFilled,
  FormOutlined,
  PayCircleFilled,
  RocketFilled,
  ToolFilled,
} from "@ant-design/icons";
import "@mdxeditor/editor/style.css";
import {
  Button,
  Card,
  Divider,
  Flex,
  FloatButton,
  Form,
  Input,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  message,
  notification,
} from "antd";
import { default as FormItem } from "antd/es/form/FormItem";
import { default as FormList } from "antd/es/form/FormList";
import type { NextPage } from "next";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import { ChainSystemChangeForm } from "~~/components/proposal/ChainSystemChangeForm";
import CustomActionForm from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";
import { useProposalThreshold, useProposeProposal } from "~~/hooks/blockchain/BCOSGovernor";
import { useVotePower } from "~~/hooks/blockchain/ERC20VotePower";

type ProposalAction = {
  key: string;
  name: string;
  abi: any[];
  address: string;
  method: string;
  calldata: string;
  value: bigint;
};

type ProposalPresentation = {
  key: string;
  icon: ReactElement;
  name: string;
};

// const selectActions: ProposalAction[] = [];
const proposalPresentations: ProposalPresentation[] = [
  {
    key: "1",
    icon: <BankFilled style={{ fontSize: "x-large" }} />,
    name: "Governor Settings",
  },
  {
    key: "2",
    icon: <ToolFilled style={{ fontSize: "x-large" }} />,
    name: "Chain System Change",
  },
  {
    key: "3",
    icon: <PayCircleFilled style={{ fontSize: "x-large" }} />,
    name: "Transfer Token",
  },
  {
    key: "4",
    icon: <BuildFilled style={{ fontSize: "x-large" }} />,
    name: "Custom Action",
  },
];

const findProposalForm = (name: string, args: any) => {
  switch (name) {
    case "Governor Settings":
      return <GovernorSettingsForm {...args} />;
    case "Chain System Change":
      return <ChainSystemChangeForm {...args} />;
    case "Transfer Token":
      return <TransferTokenForm {...args} />;
    case "Custom Action":
      return <CustomActionForm {...args} />;
    default:
      return null;
  }
};

const MDXEditor = dynamic(() => import("~~/components/MarkdownInput"), { ssr: false });

type ProposalStorage = {
  title: string;
  description: string;
  actions: ProposalAction[];
};

const ProposalCreation: NextPage = () => {
  const [form] = Form.useForm();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notifyApi, notifyContextHolder] = notification.useNotification();

  const submitter = useProposeProposal();
  const { address } = useAccount();
  const { votePowerData, refetchVotePower } = useVotePower(address || "");
  const proposalThreshold = useProposalThreshold();
  const [canSubmitProposal, setCanSubmitProposal] = useState<boolean>(false);
  const [openConfirmSubmit, setOpenConfirmSubmit] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  useEffect(() => {
    refetchVotePower();
  }, [address, refetchVotePower]);
  useEffect(() => {
    if (votePowerData && proposalThreshold) {
      if (votePowerData >= proposalThreshold) {
        setCanSubmitProposal(true);
      }
      console.log("votePowerData", votePowerData);
      console.log("proposalThreshold", proposalThreshold);
    }
  }, [proposalThreshold, votePowerData]);

  function submitProposal() {
    return async (values: ProposalStorage) => {
      try {
        console.log("onFinish", values);
        const title = values.title;
        const description = values.description;
        if (!values.actions || values.actions.length === 0) {
          notifyApi.error({
            message: "Please add at least one action",
            description: "Action is required for submit proposal.",
          });
          return;
        }
        const targets: string[] = [];
        const valuesArray: bigint[] = [];
        const calldatas: string[] = [];
        for (let i = 0; i < values.actions.length; i++) {
          const action = values.actions[i];
          if (!action.calldata || !action.address || action.value === undefined || action.value === null) {
            messageApi.info("Please fill in all fields for Action#" + (i + 1));
            form.scrollToField(["actions", i]);
            return;
          }
          targets.push(action.address);
          valuesArray.push(action.value);
          calldatas.push(action.calldata);
        }
        setSubmitting(true);
        submitter(title, targets, valuesArray, calldatas, description)
          .then(
            () => {
              notifyApi.open({
                type: "success",
                message: "Proposal created successfully",
              });
              window.location.href = "/";
            },
            error => {
              console.error("Error creating proposal", error);
              messageApi.error("Failed to create proposal");
            },
          )
          .catch(error => {
            console.error("Error creating proposal", error);
            messageApi.error("Failed to create proposal");
          })
          .finally(() => {
            setSubmitting(false);
          });
      } catch (error) {
        notifyApi.open({
          type: "error",
          message: "Failed to create proposal",
        });
      }
    };
  }

  return (
    <main className="container mx-auto w-full px-4 py-6">
      {/*<FloatButton tooltip={<div>DAO Parameters</div>} onClick={() => console.log("click")}></FloatButton>*/}
      <Spin spinning={submitting} fullscreen size={"large"}></Spin>
      <div className="flex justify-between">
        <div className="inline-grid grid-cols-2 gap-4">
          <Button
            disabled
            icon={<EditFilled />}
            size="large"
            className="bg-primary text-primary-content"
            variant="filled"
          >
            Edit
          </Button>
          <Button
            disabled
            icon={<CaretRightFilled />}
            size="large"
            className="bg-primary text-primary-content"
            variant="filled"
          >
            Preview
          </Button>
        </div>
        <div>
          <Popconfirm
            title="Submit the proposal"
            description={
              <div>
                <div>{"You don't have enough voting power to submit the proposal."}</div>
                <div>{"Are you sure you want to submit?"}</div>
              </div>
            }
            open={openConfirmSubmit}
            onOpenChange={(newOpen: boolean) => {
              if (!newOpen) {
                setOpenConfirmSubmit(newOpen);
                return;
              }
              if (canSubmitProposal) {
                form.submit();
              } else {
                setOpenConfirmSubmit(newOpen);
              }
            }}
            onConfirm={async () => {
              setOpenConfirmSubmit(false);
              form.submit();
            }}
            onCancel={() => {
              setOpenConfirmSubmit(false);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<RocketFilled />}
              size="large"
              className="bg-primary text-primary-content"
              variant="filled"
              htmlType={"submit"}
            >
              Submit
            </Button>
          </Popconfirm>
        </div>
      </div>
      <Divider />
      <div>{messageContextHolder}</div>
      <div>{notifyContextHolder}</div>
      <Form form={form} layout="vertical" size="large" onFinish={submitProposal()}>
        <Card className="bg-base-200 border-base-200 shadow">
          <Tag
            color={isDark ? "geekblue-inverse" : "geekblue"}
            bordered={false}
            className="text-lg font-bold content-center mb-4"
          >
            Main Information
          </Tag>
          <FormItem
            name="title"
            label={<h3 className="text-lg font-semibold text-base-content mb-2">Title</h3>}
            rules={[
              {
                required: true,
                message: "Please enter the title of your proposal",
              },
            ]}
          >
            <input
              className="text-base w-full h-12 rounded-xl bg-base-100 text-base-content p-4 border-2 border-base-300 focus:border-primary focus:outline-none"
              placeholder="Enter the title of your proposal"
            ></input>
          </FormItem>
          <FormItem
            name="description"
            label={<h3 className="text-lg font-semibold text-base-content mb-2">Description</h3>}
            rules={[
              {
                required: true,
                message: "Please enter the description of your proposal",
              },
            ]}
          >
            <MDXEditor markdown={""} />
          </FormItem>
        </Card>

        <FormList
          name="actions"
          rules={[
            {
              validator: async () => {
                const value = form.getFieldValue("actions");
                if (!value || value.length === 0) {
                  return Promise.resolve(new Error("Please add at least one action"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          {(fields: any, { add, remove }) => (
            <>
              {fields.map((field: any, index: number) => {
                console.log(field);
                return (
                  <Card key={field.key} className="mb-3 mt-3 bg-base-200 border-base-200">
                    {/*actions and remove*/}
                    <div className="flex justify-between mb-4">
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Tag
                          color={isDark ? "geekblue-inverse" : "geekblue"}
                          bordered={false}
                          className="text-lg font-bold content-center"
                        >
                          {"Action #" + (index + 1).toString() + ": " + form.getFieldValue(["actions", index, "name"])}
                        </Tag>
                      </div>
                      <div className="inline-grid grid-cols-1 gap-4">
                        <Button
                          size="large"
                          icon={<CloseSquareFilled />}
                          color="default"
                          className="bg-primary text-primary-content border-base-200"
                          onClick={() => {
                            remove(field.name);
                          }}
                        >
                          Remove action
                        </Button>
                      </div>
                    </div>
                    <FormItem noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const actionName = getFieldValue(["actions", index, "name"]);
                        const action = proposalPresentations.find(action => action.name === actionName);
                        if (!action) return null;
                        const onChange = (value: any) => {
                          console.log("onChange", value);
                          const actions = form.getFieldValue(["actions", index]);
                          form.setFieldValue(["actions", index], { ...actions, ...value });
                        };
                        return findProposalForm(actionName, {
                          parentForm: form,
                          field,
                          index,
                          onChange,
                        });
                      }}
                    </FormItem>
                  </Card>
                );
              })}

              {/*add actions*/}
              <FormItem noStyle>
                <Card variant="borderless" type="inner" className="mb-3 mt-3 bg-base-200">
                  <Flex gap="large">
                    {proposalPresentations.map(action => (
                      <button
                        key={action.key}
                        className="bg-base-100 border-base-200 hover:bg-base-300 rounded-xl"
                        style={{
                          fontWeight: "bold",
                          fontSize: "medium",
                          width: "400px",
                          height: "60px",
                          justifyContent: "left",
                        }}
                        onClick={() => {
                          add({ name: action.name, value: 0, calldata: "" });
                        }}
                      >
                        <div className="flex gap-3 justify-start pl-4">
                          <div className="text-base-content">{action.icon}</div>
                          <div className="text-base-content">{action.name}</div>
                        </div>
                      </button>
                    ))}
                  </Flex>
                </Card>
              </FormItem>
            </>
          )}
        </FormList>
        {/*<Form.Item noStyle shouldUpdate>*/}
        {/*  {() => (*/}
        {/*    <Typography>*/}
        {/*      <pre>{JSON.stringify(form.getFieldsValue(), null, 2)}</pre>*/}
        {/*    </Typography>*/}
        {/*  )}*/}
        {/*</Form.Item>*/}
      </Form>
    </main>
  );
};

export default ProposalCreation;
