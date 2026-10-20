import { Api } from "teleproto";

export interface DocumentInfo {
  fileName: string;
  size: number;
  mimeType: string;
}

/** Extract document details from a message, if it carries a file. */
export function getDocumentInfo(
  message: Api.Message,
): DocumentInfo | undefined {
  if (!(message.media instanceof Api.MessageMediaDocument)) return undefined;
  const doc = message.media.document;
  if (!(doc instanceof Api.Document)) return undefined;
  const nameAttr = doc.attributes.find(
    (a): a is Api.DocumentAttributeFilename =>
      a instanceof Api.DocumentAttributeFilename,
  );
  return {
    fileName: nameAttr?.fileName ?? `message-${message.id}`,
    size: Number(doc.size.toString()),
    mimeType: doc.mimeType,
  };
}
