/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {backend_util, Dilation2DAttrs, Dilation2DBackpropInput, KernelConfig, KernelFunc, Tensor3D, Tensor4D, TensorInfo} from '@tensorflow/tfjs-core';

import {BackendWasm} from '../backend_wasm';

import {CppDType} from './types';

let wasmDilation2DBackpropInput: (
    xId: number, filterId: number, dyId: number, gradId: number, dtype: number,
    batch: number, depth: number, inHeight: number, inWidth: number,
    outHeight: number, outWidth: number, strideHeight: number,
    strideWidth: number, dilationHeight: number, dilationWidth: number,
    filterHeight: number, filterWidth: number, padTop: number,
    padLeft: number) => void;

function setup(backend: BackendWasm) {
  wasmDilation2DBackpropInput =
      backend.wasm.cwrap(Dilation2DBackpropInput, null, [
        'number',  // xId
        'number',  // filterId
        'number',  // dyId
        'number',  // gradId
        'number',  // dtype
        'number',  // batch
        'number',  // depth
        'number',  // inHeight
        'number',  // inWidth
        'number',  // outHeight
        'number',  // outWidth
        'number',  // strideHeight
        'number',  // strideWidth
        'number',  // dilationHeight
        'number',  // dilationWidth
        'number',  // filterHeight
        'number',  // filterWidth
        'number',  // padTop
        'number',  // padLeft
      ]);
}

export function dilation2DBackpropInput(args: {
  inputs: {x: Tensor4D, filter: Tensor3D, dy: Tensor4D},
  attrs: Dilation2DAttrs,
  backend: BackendWasm,
}): TensorInfo {
  const {inputs, backend, attrs} = args;
  const {x, filter, dy} = inputs;
  const {strides, pad, dilations} = attrs;

  if (x.dtype !== filter.dtype || x.dtype !== dy.dtype) {
    throw new Error(
        `Dilation2DBackpropInput error: x must have the same dtype as filter and dy. Got ${
            x.dtype}, ${filter.dtype}, and ${dy.dtype}`);
  }

  const dilationInfo = backend_util.computeDilation2DInfo(
      x.shape as [number, number, number, number],
      filter.shape as [number, number, number], strides, pad,
      /*dataFormat=*/'NHWC', dilations);

  const gradients = backend.makeOutput(x.shape, x.dtype);

  wasmDilation2DBackpropInput(
      backend.dataIdMap.get(x.dataId).id,
      backend.dataIdMap.get(filter.dataId).id,
      backend.dataIdMap.get(dy.dataId).id,
      backend.dataIdMap.get(gradients.dataId).id,
      CppDType[x.dtype],
      dilationInfo.batchSize,
      /*depth=*/dilationInfo.inChannels,
      dilationInfo.inHeight,
      dilationInfo.inWidth,
      dilationInfo.outHeight,
      dilationInfo.outWidth,
      dilationInfo.strideHeight,
      dilationInfo.strideWidth,
      dilationInfo.dilationHeight,
      dilationInfo.dilationWidth,
      dilationInfo.filterHeight,
      dilationInfo.filterWidth,
      dilationInfo.padInfo.top,
      dilationInfo.padInfo.left,
  );
  return gradients;
}

export const dilation2DBackpropInputConfig: KernelConfig = {
  kernelName: Dilation2DBackpropInput,
  backendName: 'wasm',
  setupFunc: setup,
  kernelFunc: dilation2DBackpropInput as unknown as KernelFunc
};
