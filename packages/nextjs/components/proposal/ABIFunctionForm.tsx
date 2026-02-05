"use client";

import { useEffect, useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { encodeFunctionData } from "viem/utils";
import {
  ContractInput,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";

type ABIFunctionFormProps = {
  abi: Abi;
  abiFunction: AbiFunction;
  onChange: (encodeData: string) => void;
  inheritedFrom?: string;
};

export const ABIFunctionForm = ({ abi, abiFunction, onChange }: ABIFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));

  // const handleWrite = async () => {
  //   try {
  //     const encodeData = encodeFunctionData({
  //       abi: abi,
  //       functionName: abiFunction.name,
  //       args: getParsedContractFunctionArgs(form),
  //     });
  //     setAbiData(encodeData);
  //     console.log(encodeData);
  //   } catch (e: any) {
  //     console.error("⚡️ ~ file: ABIFunctionForm.tsx:handleWrite ~ error", e);
  //   }
  // };

  useEffect(() => {
    if (abiFunction) {
      setForm(() => getInitialFormState(abiFunction));
    }
  }, [abiFunction]);
  useEffect(() => {
    if (form) {
      try {
        console.log(form);
        const encodeData = encodeFunctionData({
          abi: abi,
          functionName: abiFunction.name,
          args: getParsedContractFunctionArgs(form),
        });
        onChange(encodeData);
      } catch (e) {
        console.error("⚡️ ~ file: ABIFunctionForm.tsx:handleWrite ~ error", e);
      }
    }
  }, [abi, form]);

  // TODO use `useMemo` to optimize also update in ReadOnlyFunctionForm
  const transformedFunction = transformAbiFunction(abiFunction);
  const inputs = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className="flex gap-3 flex-col">
        <p className="font-medium my-0 break-words text-base-content">{abiFunction.name}</p>
        {inputs}
      </div>
    </div>
  );
};
