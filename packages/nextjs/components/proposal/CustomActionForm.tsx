"use client";

import React, { ReactElement, useState } from "react";
import { InboxOutlined, InfoCircleFilled } from "@ant-design/icons";
import { Abi, AbiFunction } from "abitype";
import { Form, Input, Select, Switch, Upload, UploadProps, message } from "antd";
import { erc20Abi, erc721Abi, erc4626Abi } from "viem";
import { ABIFunctionForm } from "~~/components/proposal/ABIFunctionForm";
import ERC1155 from "~~/contracts/abi/ERC1155.json";
import GovernorABI from "~~/contracts/abi/GovernorUpgradeable.json";
import IVotes from "~~/contracts/abi/IVotes.json";
import TimelockABI from "~~/contracts/abi/TimelockControllerUpgradeable.json";

export const actionSelectOptions = [
  {
    label: <div>ERC-20</div>,
    value: "erc20",
    abi: erc20Abi,
  },
  {
    label: <div>ERC-721</div>,
    value: "erc721",
    abi: erc721Abi,
  },
  {
    label: <div>ERC-1155</div>,
    value: "erc1155",
    abi: ERC1155.abi,
  },
  {
    label: <div>ERC-4626</div>,
    value: "erc4626",
    abi: erc4626Abi,
  },
  {
    label: <div>IVotes</div>,
    value: "votes",
    abi: IVotes.abi,
  },
  {
    label: <div>OpenZeppelin Governor</div>,
    value: "ozGovernor",
    abi: GovernorABI.abi,
  },
  {
    label: <div>OpenZeppelin Timelock</div>,
    value: "ozTimelock",
    abi: TimelockABI.abi,
  },
  {
    label: <div>Upload an ABI</div>,
    value: "uploadABI",
    abi: [],
  },
  {
    label: <div>Use pure calldata</div>,
    value: "pureCalldata",
    abi: [],
  },
];

const props: UploadProps = {
  name: "file",
  multiple: true,
  action: "",
  onChange(info) {
    const { status } = info.file;
    if (status !== "uploading") {
      console.log(info.file, info.fileList);
    }
    if (status === "done") {
      message.success(`${info.file.name} file uploaded successfully.`).then();
    } else if (status === "error") {
      message.error(`${info.file.name} file upload failed.`).then();
    }
  },
  onDrop(e) {
    console.log("Dropped files", e.dataTransfer.files);
  },
};

const CustomActionForm = ({ field, index, onChange }: { field?: any; index?: any; onChange: any }) => {
  const FormItem = Form.Item;
  const { Dragger } = Upload;
  const parentForm = Form.useFormInstance();
  const [customActionForm] = Form.useForm();
  const [valueVisible, setValueVisible] = useState<boolean>(false);
  const [draggerVisible, setDraggerVisible] = useState<boolean>(false);
  const [pureCallData, setPureCallData] = useState<boolean>(false);
  const [abi, setAbi] = useState<Abi>();
  const [methodList, setMethodList] = useState<AbiFunction[]>();
  const [methodOptions, setMethodOptions] = useState<{ label: ReactElement; value: string }[]>(
    [] as { label: ReactElement; value: string }[],
  );
  const [method, setMethod] = useState<{ fn: AbiFunction }>();

  const onABIChange = (value: string) => {
    if (value === "pureCalldata") {
      setPureCallData(true);
    } else if (value === "uploadABI") {
      setDraggerVisible(true);
      setPureCallData(false);
    } else {
      setDraggerVisible(false);
      setPureCallData(false);
      const contractAbi = actionSelectOptions.find(option => option.value === value);
      const abi = contractAbi?.abi as Abi;
      setAbi(abi);
      const functions = abi?.filter(
        part => part.type === "function" && part.stateMutability !== "pure" && part.stateMutability !== "view",
      ) as AbiFunction[];
      setMethodList(functions);
      const methodOptions = functions.map(fn => ({ label: <div>{fn.name}</div>, value: fn.name }));
      setMethodOptions(methodOptions);
    }
  };

  const handleChange = (value: string) => {
    const functionsToDisplay = methodList?.filter(fn => fn.name === value).map(fn => ({ fn }));
    if (!functionsToDisplay || !functionsToDisplay.length) {
      return <>No write methods</>;
    }
    if (functionsToDisplay.length > 0) {
      setMethod({ fn: functionsToDisplay[0].fn });
    }
  };
  return (
    <>
      <Form
        layout={"vertical"}
        form={customActionForm}
        onValuesChange={e => {
          console.log("onChange", e);
          onChange(customActionForm.getFieldsValue());
        }}
      >
        <FormItem name="address" label={<div className="text-lg font-bold mb-1">Target Contract Address</div>}>
          <Input className="h-12"></Input>
        </FormItem>
        <FormItem name="abi" label={<div className="text-lg font-bold mb-1">Use the imported ABI or upload yours</div>}>
          <Select
            options={actionSelectOptions}
            className="h-12"
            defaultActiveFirstOption={true}
            placeholder={"Use the imported ABI"}
            onChange={onABIChange}
          ></Select>
        </FormItem>
        {draggerVisible && (
          <div className="mb-4">
            <Dragger {...props}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload your ABI file</p>
              <p className="ant-upload-hint">
                Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned
                files.
              </p>
            </Dragger>
          </div>
        )}

        {abi && (
          <FormItem name="method" label={<div className="text-lg font-bold mb-1">Contract Method</div>}>
            <Select className="h-12" options={methodOptions} onSelect={handleChange}></Select>
            <div className="inline-flex gap-2">
              <InfoCircleFilled style={{ color: "orange" }}></InfoCircleFilled>
              <div> This ABI is a standard. Please, be sure the smart contract implements the method you selected.</div>
            </div>
          </FormItem>
        )}

        {method && (
          <FormItem label={<div className="text-lg font-bold mb-1">Method arguments</div>}>
            <div>
              {abi && method && (
                <ABIFunctionForm
                  abi={abi}
                  abiFunction={method.fn as AbiFunction}
                  onChange={(encodeData: string) => {
                    console.log(encodeData);
                    parentForm.setFieldValue(["actions", index, "calldata"], encodeData);
                  }}
                  inheritedFrom={""}
                />
              )}
            </div>
          </FormItem>
        )}
        {pureCallData && (
          <FormItem name="calldata" label={<div className="text-lg font-bold mb-1">Calldatas</div>}>
            <Input
              className="h-12"
              placeholder={"The data for the function arguments you wish to send when the action executes"}
            ></Input>
          </FormItem>
        )}
        <div className="mb-4 inline-flex gap-2">
          <div>Also send Token to the target address? (this is not common)</div>
          <Switch onChange={() => setValueVisible(!valueVisible)}></Switch>
        </div>
        {valueVisible && (
          <FormItem name="value" label={<div className="text-lg font-bold mb-1">Value</div>}>
            <div className="mb-3">
              The amount of Balance you wish to send the target address (External Account or Smart Contract)
            </div>
            <Input prefix="ETH" className="h-12"></Input>
          </FormItem>
        )}
      </Form>
    </>
  );
};

export default CustomActionForm;
