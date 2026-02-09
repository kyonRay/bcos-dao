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
import { Button, Card, Divider, Dropdown, Form, Popconfirm, Spin, Tag, Typography, message, notification } from "antd";
import { default as FormItem } from "antd/es/form/FormItem";
import { default as FormList } from "antd/es/form/FormList";
import type { NextPage } from "next";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import { ChainSystemChangeForm } from "~~/components/proposal/ChainSystemChangeForm";
import CustomActionForm from "~~/components/proposal/CustomActionForm";
import GovernorSettingsForm from "~~/components/proposal/GovernorSettingsForm";
import { ProposalOverview } from "~~/components/proposal/ProposalOverview";
import TransferTokenForm from "~~/components/proposal/TransferTokenForm";
import type { ProposalAllInfo } from "~~/hooks/blockchain/BCOSGovernor";
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

/** Wrapper so Form.Item value/onChange sync with MDXEditor markdown/onChange */
const DescriptionEditor = ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => (
  <MDXEditor markdown={value ?? ""} onChange={md => onChange?.(md)} />
);

type ProposalStorage = {
  title: string;
  description: string;
  actions: ProposalAction[];
};

/** Check if action at index has required fields filled (for validation indicator and submit) */
function isActionValid(action: { address?: string; calldata?: string; value?: unknown } | undefined): boolean {
  if (!action) return false;
  return !(
    action.calldata === undefined ||
    action.calldata === "" ||
    !action.address ||
    action.value === undefined ||
    action.value === null
  );
}

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
  /** 'proposal' = main info; number = action index */
  const [selectedSection, setSelectedSection] = useState<"proposal" | number>("proposal");
  /** Edit vs Preview mode */
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const watchedTitle = Form.useWatch("title", form);
  const watchedDescription = Form.useWatch("description", form);

  const goToPreview = () => {
    setMode("preview");
  };

  /** Build preview proposal from current form values (use watched + getFieldsValue so title/description are up-to-date) */
  const getPreviewProposal = (): ProposalAllInfo => {
    const values = form.getFieldsValue() as { actions?: ProposalAction[] };
    const actions = Array.isArray(values.actions) ? values.actions : [];
    const title = typeof watchedTitle === "string" ? watchedTitle : String(watchedTitle ?? "");
    const description = typeof watchedDescription === "string" ? watchedDescription : String(watchedDescription ?? "");
    return {
      id: 0,
      proposer: address ?? "0x0000000000000000000000000000000000000000",
      startTime: 0,
      endTime: 0,
      eta: 0,
      state: "Preview",
      targets: actions.map((a: ProposalAction) => a?.address ?? "0x"),
      values: actions.map((a: ProposalAction) => BigInt(a?.value ?? 0)),
      calldatas: actions.map((a: ProposalAction) => a?.calldata ?? "0x"),
      description,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      title,
      createBlock: 0,
      executedBlock: 0,
      canceledBlock: 0,
    };
  };
  useEffect(() => {
    refetchVotePower();
  }, [address, refetchVotePower]);
  // Ensure Form.List "actions" is always an array so rc-field-form add() does not spread non-iterable
  useEffect(() => {
    const v = form.getFieldValue("actions");
    if (v !== undefined && v !== null && !Array.isArray(v)) {
      form.setFieldsValue({ actions: [] });
    }
  }, [form]);
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
          if (!isActionValid(action)) {
            setSelectedSection(i);
            messageApi.warning("Please fill in all fields for Action #" + (i + 1));
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
            icon={<EditFilled />}
            size="large"
            type={mode === "edit" ? "primary" : "default"}
            className={mode === "edit" ? "bg-primary text-primary-content" : ""}
            variant="filled"
            onClick={() => setMode("edit")}
          >
            Edit
          </Button>
          <Button
            icon={<CaretRightFilled />}
            size="large"
            type={mode === "preview" ? "primary" : "default"}
            className={mode === "preview" ? "bg-primary text-primary-content" : ""}
            variant="filled"
            onClick={goToPreview}
          >
            Preview
          </Button>
        </div>
        <div className={mode === "preview" ? "invisible" : ""}>
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

      {/* Form always mounted but hidden in preview so values are preserved when switching back to Edit */}
      <div className={mode === "preview" ? "hidden" : "block"}>
        <Form
          form={form}
          initialValues={{ actions: [], title: "", description: "" }}
          layout="vertical"
          size="large"
          onFinish={submitProposal()}
          onFinishFailed={({ errorFields }) => {
            const first = errorFields?.[0];
            if (!first) return;
            const path = first.name as string[];
            if (path[0] === "actions") {
              if (typeof path[1] === "number") {
                setSelectedSection(path[1]);
              } else {
                setSelectedSection("proposal");
              }
            } else if (path[0] === "title" || path[0] === "description") {
              setSelectedSection("proposal");
            }
          }}
        >
          {/* 不可见 Form.Item：把 title/description 挂在 form 根上，供校验与 getFieldsValue；实际编辑在右侧「主信息」里 */}
          <FormItem
            name="title"
            noStyle
            rules={[{ required: true, message: "Please enter the title of your proposal" }]}
          >
            <input type="hidden" />
          </FormItem>
          <FormItem
            name="description"
            noStyle
            rules={[{ required: true, message: "Please enter the description of your proposal" }]}
          >
            <input type="hidden" />
          </FormItem>

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
            {(fields: any, { add, remove }) => {
              const rawActions = form.getFieldValue("actions");
              const actions = Array.isArray(rawActions) ? rawActions : [];
              const addAction = (name: string) => {
                const current = form.getFieldValue("actions");
                if (!Array.isArray(current)) {
                  form.setFieldsValue({ actions: [] });
                  setTimeout(() => {
                    add({ name, value: 0, calldata: "" });
                    setSelectedSection(fields.length);
                  }, 0);
                  return;
                }
                add({ name, value: 0, calldata: "" });
                setSelectedSection(fields.length);
              };
              const addActionMenuItems = proposalPresentations.map(ap => ({
                key: ap.key,
                label: (
                  <div className="flex items-center gap-3 py-1">
                    {ap.icon}
                    <span>{ap.name}</span>
                  </div>
                ),
                onClick: () => addAction(ap.name),
              }));

              return (
                <div className="flex gap-6 mt-4">
                  {/* Left: proposal + action list + Add Action */}
                  <div className="w-72 shrink-0 flex flex-col gap-2">
                    <Card
                      size="small"
                      className={`cursor-pointer transition-all ${
                        selectedSection === "proposal"
                          ? "ring-2 ring-primary bg-base-300"
                          : "bg-base-200 border-base-200 hover:bg-base-300"
                      }`}
                      onClick={() => setSelectedSection("proposal")}
                    >
                      <div className="flex items-center gap-3">
                        <FormOutlined style={{ fontSize: "1.25rem" }} className="text-base-content" />
                        <span className="font-medium text-base-content">Proposal text</span>
                      </div>
                    </Card>
                    {fields.map((field: any, index: number) => {
                      const actionName = actions[index]?.name ?? "";
                      const actionPres = proposalPresentations.find(ap => ap.name === actionName);
                      const invalid = !isActionValid(actions[index]);
                      return (
                        <Card
                          key={field.key}
                          size="small"
                          className={`cursor-pointer transition-all ${
                            selectedSection === index
                              ? "ring-2 ring-primary bg-base-300"
                              : "bg-base-200 border-base-200 hover:bg-base-300"
                          }`}
                          onClick={() => setSelectedSection(index)}
                        >
                          <div className="flex items-center gap-3">
                            {actionPres?.icon ?? <ToolFilled style={{ fontSize: "1.25rem" }} />}
                            <span className="font-medium text-base-content truncate flex-1">
                              {actionName || `Action #${index + 1}`}
                            </span>
                            {invalid && <span className="w-2 h-2 rounded-full bg-error shrink-0" title="Incomplete" />}
                          </div>
                        </Card>
                      );
                    })}
                    <Dropdown menu={{ items: addActionMenuItems }} trigger={["click"]} placement="bottomLeft">
                      <Button
                        type="primary"
                        className="w-full bg-base-300 text-base-content border-base-300 hover:!bg-base-content hover:!text-base-300"
                        icon={<span className="text-lg leading-none">+</span>}
                      >
                        Add Action
                      </Button>
                    </Dropdown>
                  </div>

                  {/* Right: 统一为「左侧选中项 → 右侧详情」；主信息与各 action 同逻辑 */}
                  <div className="flex-1 min-w-0">
                    {selectedSection === "proposal" && (
                      <Card className="bg-base-200 border-base-200 shadow">
                        <Tag
                          color={isDark ? "geekblue-inverse" : "geekblue"}
                          bordered={false}
                          className="text-lg font-bold content-center mb-4"
                        >
                          Main Information
                        </Tag>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-base-content mb-2">Title</h3>
                          <input
                            className="text-base w-full h-12 rounded-xl bg-base-100 text-base-content p-4 border-2 border-base-300 focus:border-primary focus:outline-none"
                            placeholder="Enter the title of your proposal"
                            value={watchedTitle ?? ""}
                            onChange={e => form.setFieldValue("title", e.target.value)}
                          />
                          {(form.getFieldError("title")?.[0] as string) && (
                            <div className="text-error text-sm mt-1">{form.getFieldError("title")?.[0]}</div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-base-content mb-2">Description</h3>
                          <DescriptionEditor
                            value={watchedDescription ?? ""}
                            onChange={v => form.setFieldValue("description", v)}
                          />
                          {(form.getFieldError("description")?.[0] as string) && (
                            <div className="text-error text-sm mt-1">{form.getFieldError("description")?.[0]}</div>
                          )}
                        </div>
                      </Card>
                    )}
                    {/* Every action form always mounted, visibility toggled */}
                    {fields.map((field: any, index: number) => (
                      <div key={field.key} className={selectedSection === index ? "block" : "hidden"}>
                        <Card className="bg-base-200 border-base-200 shadow">
                          <div className="flex justify-between items-center mb-4">
                            <Tag
                              color={isDark ? "geekblue-inverse" : "geekblue"}
                              bordered={false}
                              className="text-lg font-bold"
                            >
                              {"Action #" + (index + 1) + ": " + (actions[index]?.name ?? "")}
                            </Tag>
                            <Button
                              size="middle"
                              danger
                              type="text"
                              icon={<CloseSquareFilled />}
                              onClick={() => {
                                remove(field.name);
                                setSelectedSection(index >= 1 ? index - 1 : fields.length > 1 ? 0 : "proposal");
                              }}
                            >
                              Remove action
                            </Button>
                          </div>
                          <FormItem noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                              const actionName = getFieldValue(["actions", index, "name"]);
                              const action = proposalPresentations.find(a => a.name === actionName);
                              if (!action) return null;
                              const onChange = (value: any) => {
                                const current = form.getFieldValue(["actions", index]);
                                form.setFieldValue(["actions", index], { ...current, ...value });
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          </FormList>
          {/*<Form.Item noStyle shouldUpdate>*/}
          {/*  {() => (*/}
          {/*    <Typography>*/}
          {/*      <pre>{JSON.stringify(form.getFieldsValue(), null, 2)}</pre>*/}
          {/*    </Typography>*/}
          {/*  )}*/}
          {/*</Form.Item>*/}
        </Form>
      </div>

      {mode === "preview" && <ProposalOverview proposal={getPreviewProposal()} isPreview={true} />}
    </main>
  );
};

export default ProposalCreation;
