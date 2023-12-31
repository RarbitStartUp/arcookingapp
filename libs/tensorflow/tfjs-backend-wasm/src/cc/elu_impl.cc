/* Copyright 2021 Google LLC. All Rights Reserved.
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
 * ===========================================================================*/

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#include "tfjs-backend-wasm/src/cc/elu_impl.h"

#include <xnnpack.h>
#include <cmath>
#include <cstddef>
#include <map>
#include <tuple>

#include "tfjs-backend-wasm/src/cc/backend.h"
#include "tfjs-backend-wasm/src/cc/util.h"

namespace tfjs::wasm {

namespace {

// We use std::tuple as the cache key as it implements the compare operator
// needed for std::map.
typedef std::tuple<size_t> EluOperatorCacheKey;

// The operator cache maps the weights id to the xnn_operator_t instantiated for
// this set of weights.
std::map<EluOperatorCacheKey, xnn_operator_t> operator_cache;

}  // namespace

void EluImpl(const float* x_buf, size_t x_size, float* out_buf) {
  xnn_operator_t elu_op = nullptr;

  const size_t channels = 1;
  EluOperatorCacheKey cache_key = {channels};

  auto operator_cache_idx = operator_cache.find(cache_key);
  if (operator_cache_idx == operator_cache.end()) {
    const size_t input_stride = channels;
    const size_t output_stride = channels;
    const float alpha = 1.0f;
    const uint32_t flags = 0;

    xnn_status status = xnn_create_elu_nc_f32(
        channels, input_stride, output_stride, alpha, flags, &elu_op);
    if (status != xnn_status_success) {
      tfjs::util::warn(
          "XNN status for xnn_create_elu_nc_f32 is not "
          "successful. Got status %d. Use -c dbg to see XNN logs.",
          status);
      return;
    }

    operator_cache.insert({cache_key, elu_op});

    tfjs::backend::xnn_operator_count++;
  } else {
    elu_op = operator_cache_idx->second;
  }

  const size_t batch = x_size;
  xnn_status status = xnn_setup_elu_nc_f32(elu_op, batch, x_buf, out_buf,
                                           tfjs::backend::threadpool);
  if (status != xnn_status_success) {
    tfjs::util::warn(
        "XNN status for xnn_setup_elu_nc_f32 is not "
        "successful. Got status %d. Use -c dbg to see XNN logs.",
        status);
    return;
  }

  xnn_run_operator(elu_op, tfjs::backend::threadpool);
}

}  // namespace tfjs::wasm
