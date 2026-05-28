Generate content with the Gemini API in Vertex AI

Use generateContent or streamGenerateContent to generate content with Gemini.

The Gemini model family includes models that work with multimodal prompt requests. The term multimodal indicates that you can use more than one modality, or type of input, in a prompt. Models that aren't multimodal accept prompts only with text. Modalities can include text, audio, video, and more.

Get started
To get started generating content with Gemini, do the following:

Create a Google Cloud account.

Review this document to learn about the Gemini model request body, parameters, and response body. To see some sample requests, see Examples.

To learn how to send a request to the Gemini API in Vertex AI by using a programming language SDK or the REST API, see the Gemini API in Vertex AI quickstart.

Request body
{
  "cachedContent": string,
  "contents": [
    {
      "role": string,
      "parts": [
        {
          // Union field data can be only one of the following:
          "text": string,
          "inlineData": {
            "mimeType": string,
            "data": string
          },
          "fileData": {
            "mimeType": string,
            "fileUri": string
          },
          // End of list of possible types for union field data.

          "thought": boolean,
          "thoughtSignature": string,
          "videoMetadata": {
            "startOffset": {
              "seconds": integer,
              "nanos": integer
            },
            "endOffset": {
              "seconds": integer,
              "nanos": integer
            },
            "fps": double
          },
          "mediaResolution": MediaResolution
        }
      ]
    }
  ],
  "systemInstruction": {
    "role": string,
    "parts": [
      {
        "text": string
      }
    ]
  },
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": string,
          "description": string,
          "parameters": {
            object (OpenAPI Object Schema)
          }
        }
      ]
    }
  ],
  "safetySettings": [
    {
      "category": enum (HarmCategory),
      "threshold": enum (HarmBlockThreshold)
    }
  ],
  "generationConfig": {
    "temperature": number,
    "topP": number,
    "topK": number,
    "candidateCount": integer,
    "maxOutputTokens": integer,
    "presencePenalty": float,
    "frequencyPenalty": float,
    "stopSequences": [
      string
    ],
    "responseMimeType": string,
    "responseSchema": schema,
    "seed": integer,
    "responseLogprobs": boolean,
    "logprobs": integer,
    "audioTimestamp": boolean,
    "thinkingConfig": {
      "thinkingBudget": integer,
      "thinkingLevel": enum
    },
    "mediaResolution": MediaResolution
  },
  "labels": {
    string: string
  }
}

The request body contains data with the following parameters:

Parameters
cachedContent

Optional: string

The name of the cached content used as context to serve the prediction. Format: projects/{project}/locations/{location}/cachedContents/{cachedContent}

contents

Required: Content

The content of the current conversation with the model.

For single-turn queries, this is a single instance. For multi-turn queries, this is a repeated field that contains conversation history and the latest request.

systemInstruction

Optional: Content

Available for gemini-2.0-flash and gemini-2.0-flash-lite.

Instructions for the model to steer it toward better performance. For example, "Answer as concisely as possible" or "Don't use technical terms in your response".

The text strings count toward the token limit.

The role field of systemInstruction is ignored and doesn't affect the performance of the model.

Note: Only text should be used in parts and content in each part should be in a separate paragraph.
tools

Optional. A piece of code that enables the system to interact with external systems to perform an action, or set of actions, outside of knowledge and scope of the model. See Function calling.

toolConfig

Optional. See Function calling.

safetySettings

Optional: SafetySetting

Per request settings for blocking unsafe content.

Enforced on GenerateContentResponse.candidates.

generationConfig

Optional: GenerationConfig

Generation configuration settings.

labels

Optional: string

Metadata that you can add to the API call in the format of key-value pairs.

contents
The base structured data type containing multi-part content of a message.

This class consists of two main properties: role and parts. The role property denotes the individual producing the content, while the parts property contains multiple elements, each representing a segment of data within a message.

contents
The base structured data type containing multi-part content of a message.

This class consists of two main properties: role and parts. The role property denotes the individual producing the content, while the parts property contains multiple elements, each representing a segment of data within a message.

parts
A data type containing media that is part of a multi-part Content message.

Parameters
text

Optional: string

A text prompt or code snippet.

inlineData

Optional: Blob

Inline data in raw bytes.

For gemini-2.0-flash-lite and gemini-2.0-flash, you can specify up to 3000 images by using inlineData.

fileData

Optional: fileData

Data stored in a file.

functionCall

Optional: FunctionCall.

It contains a string representing the FunctionDeclaration.name field and a structured JSON object containing any parameters for the function call predicted by the model.

See Function calling.

functionResponse

Optional: FunctionResponse.

The result output of a FunctionCall that contains a string representing the FunctionDeclaration.name field and a structured JSON object containing any output from the function call. It is used as context to the model.

See Function calling.

thought

Optional: boolean

Indicates whether the part represents the model's thought process or reasoning.

thoughtSignature

Optional: string (bytes format)

An opaque signature for the thought so it can be reused in subsequent requests. A base64-encoded string.

videoMetadata

Optional: VideoMetadata

For video input, the start and end offset of the video in Duration format, and the frame rate of the video . For example, to specify a 10 second clip starting at 1:00 with a frame rate of 10 frames per second, set the following:

"startOffset": { "seconds": 60 }
"endOffset": { "seconds": 70 }
"fps": 10.0
The metadata should only be specified while the video data is presented in inlineData or fileData.

mediaResolution

Optional: MediaResolution

Per-part media resolution for the input media. Controls how input media is processed. If specified, this overrides the mediaResolution setting in generationConfig. LOW reduces tokens per image/video, possibly losing detail but allowing longer videos in context. Supported values: HIGH, MEDIUM, LOW.

blob
Content blob. If possible send as text rather than raw bytes.

Parameters
mimeType

string

The media type of the file specified in the data or fileUri fields. Acceptable values include the following:
Click to expand MIME types

For gemini-2.0-flash-lite and gemini-2.0-flash, the maximum length of an audio file is 8.4 hours and the maximum length of a video file (without audio) is one hour. For more information, see Gemini audio and video requirements.

Text files must be UTF-8 encoded. The contents of the text file count toward the token limit.

There is no limit on image resolution.

data

bytes

The base64 encoding of the image, PDF, or video to include inline in the prompt. When including media inline, you must also specify the media type (mimeType) of the data.

Size limit: 7 MB for images

FileData
URI or web-URL data.

Parameters
mimeType

string

IANA MIME type of the data.

fileUri

string

The URI or URL of the file to include in the prompt. Acceptable values include the following:

Cloud Storage bucket URI: The object must either be publicly readable or reside in the same Google Cloud project that's sending the request. For gemini-2.0-flash and gemini-2.0-flash-lite, the size limit is 2 GB.
HTTP URL: The file URL must be publicly readable. You can specify one video file, one audio file, and up to 10 image files per request. Audio files, video files, and documents can't exceed 15 MB.
YouTube video URL:The YouTube video must be either owned by the account that you used to sign in to the Google Cloud console or is public. Only one YouTube video URL is supported per request.
When specifying a fileURI, you must also specify the media type (mimeType) of the file. If VPC Service Controls is enabled, specifying a media file URL for fileURI is not supported.

functionCall
A predicted functionCall returned from the model that contains a string representing the functionDeclaration.name and a structured JSON object containing the parameters and their values.

Parameters
name

string

The name of the function to call.

args

Struct

The function parameters and values in JSON object format.

See Function calling for parameter details.

functionResponse
The resulting output from a FunctionCall that contains a string representing the FunctionDeclaration.name. Also contains a structured JSON object with the output from the function (and uses it as context for the model). This should contain the result of a FunctionCall made based on model prediction.

Parameters
name

string

The name of the function to call.

response

Struct

The function response in JSON object format.

videoMetadata
Metadata describing the input video content.

Parameters
startOffset

Optional: google.protobuf.Duration

The start offset of the video.

endOffset

Optional: google.protobuf.Duration

The end offset of the video.

fps

Optional: double

The frame rate of the video sent to the model. Defaults to 1.0 if not specified. The minimum accepted value is as low as, but not including, 0.0. The maximum value is 24.0.

safetySetting
Safety settings.

Parameters
category

Optional: HarmCategory

The safety category to configure a threshold for. Acceptable values include the following:

Click to expand safety categories

HARM_CATEGORY_SEXUALLY_EXPLICIT
HARM_CATEGORY_HATE_SPEECH
HARM_CATEGORY_HARASSMENT
HARM_CATEGORY_DANGEROUS_CONTENT
threshold

Optional: HarmBlockThreshold

The threshold for blocking responses that could belong to the specified safety category based on probability.

OFF
BLOCK_NONE
BLOCK_LOW_AND_ABOVE
BLOCK_MEDIUM_AND_ABOVE
BLOCK_ONLY_HIGH
method

Optional: HarmBlockMethod

Specify if the threshold is used for probability or severity score. If not specified, the threshold is used for probability score.

harmCategory
Harm categories that block content.

Parameters
HARM_CATEGORY_UNSPECIFIED

The harm category is unspecified.

HARM_CATEGORY_HATE_SPEECH

The harm category is hate speech.

HARM_CATEGORY_DANGEROUS_CONTENT

The harm category is dangerous content.

HARM_CATEGORY_HARASSMENT

The harm category is harassment.

HARM_CATEGORY_SEXUALLY_EXPLICIT

The harm category is sexually explicit content.

harmBlockThreshold
Probability thresholds levels used to block a response.

Parameters
HARM_BLOCK_THRESHOLD_UNSPECIFIED

Unspecified harm block threshold.

BLOCK_LOW_AND_ABOVE

Block low threshold and higher (i.e. block more).

BLOCK_MEDIUM_AND_ABOVE

Block medium threshold and higher.

BLOCK_ONLY_HIGH

Block only high threshold (i.e. block less).

BLOCK_NONE

Block none.

OFF

Switches off safety if all categories are turned OFF

harmBlockMethod
A probability threshold that blocks a response based on a combination of probability and severity.

Parameters
HARM_BLOCK_METHOD_UNSPECIFIED

The harm block method is unspecified.

SEVERITY

The harm block method uses both probability and severity scores.

PROBABILITY

The harm block method uses the probability score.

Examples
Text Generation
Generate a text response from a text input.

Gen AI SDK for Python
Python (OpenAI)
Go



from google import genai
from google.genai.types import HttpOptions

client = genai.Client(http_options=HttpOptions(api_version="v1"))
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="How does AI work?",
)
print(response.text)
# Example response:
# Okay, let's break down how AI works. It's a broad field, so I'll focus on the ...
#
# Here's a simplified overview:
# ...
Using multimodal prompt
Generate a text response from a multimodal input, such as text and an image.

Gen AI SDK for Python
Python (OpenAI)
Go



from google import genai
from google.genai.types import HttpOptions, Part

client = genai.Client(http_options=HttpOptions(api_version="v1"))
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        "What is shown in this image?",
        Part.from_uri(
            file_uri="gs://cloud-samples-data/generative-ai/image/scones.jpg",
            mime_type="image/jpeg",
        ),
    ],
)
print(response.text)
# Example response:
# The image shows a flat lay of blueberry scones arranged on parchment paper. There are ...
Streaming text response
Generate a streaming model response from a text input.

Gen AI SDK for Python
Python (OpenAI)
Go



from google import genai
from google.genai.types import HttpOptions

client = genai.Client(http_options=HttpOptions(api_version="v1"))

for chunk in client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Why is the sky blue?",
):
    print(chunk.text, end="")
# Example response:
# The
#  sky appears blue due to a phenomenon called **Rayleigh scattering**. Here's
#  a breakdown of why:
# ...
Model versions
To use the auto-updated version, specify the model name without the trailing version number, for example gemini-2.0-flash instead of gemini-2.0-flash-001.

For more information, see Gemini model versions and lifecycle.