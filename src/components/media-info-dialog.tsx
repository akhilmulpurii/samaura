import React from "react";

import { MediaSourceInfo, MediaStream } from "../types/jellyfin";
import { ScrollArea } from "./ui/scroll-area";

interface MediaInfoDialogProps {
  mediaSource: MediaSourceInfo;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function MediaInfoDialog({ mediaSource }: MediaInfoDialogProps) {
  if (!mediaSource) return null;

  const videoStream = mediaSource.MediaStreams!.find(
    (s: MediaStream) => s.Type === "Video"
  );
  const audioStreams = mediaSource.MediaStreams!.filter(
    (s: MediaStream) => s.Type === "Audio"
  );
  const subtitleStreams = mediaSource.MediaStreams!.filter(
    (s: MediaStream) => s.Type === "Subtitle"
  );

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="text-sm">
        <h2 className="text-lg font-semibold mb-4 font-poppins">File Name</h2>
        {mediaSource.Path && (
          <div className="mb-4 break-all text font-semibold text-foreground font-mono">
            {mediaSource.Path.split("/").pop()}
          </div>
        )}
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-2 font-poppins">General</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <dt className="font-semibold">Container</dt>
            <dd>{mediaSource.Container}</dd>

            <dt className="font-semibold">Size</dt>
            <dd>{formatBytes(mediaSource.Size!)}</dd>

            <dt className="font-semibold">Path</dt>

            <div className="overflow-x-scroll h-8 whitespace-nowrap font-mono">
              <dd>{mediaSource.Path}</dd>
            </div>
          </dl>
        </section>

        {videoStream && (
          <section className="mb-6">
            <h3 className="font-semibold text-lg font-poppins mb-2">Video</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pl-4">
              <dt className="font-semibold">Codec</dt>
              <dd>{videoStream.Codec}</dd>

              <dt className="font-semibold">Resolution</dt>
              <dd>
                {videoStream.Width}x{videoStream.Height}
              </dd>

              <dt className="font-semibold">Bitrate</dt>
              <dd>{Math.round(videoStream.BitRate! / 1000)} kbps</dd>

              <dt className="font-semibold">Frame Rate</dt>
              <dd>{videoStream.AverageFrameRate} fps</dd>
            </dl>
          </section>
        )}

        {audioStreams.length > 0 && (
          <section className="mb-6">
            <h3 className="font-semibold text-lg font-poppins mb-2">Audio</h3>
            {audioStreams.map((stream: MediaStream, index: number) => (
              <div key={index} className="mb-4 last:mb-0">
                <h4 className="font-medium text-base mb-2 pl-4">
                  Audio Stream {index + 1}
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pl-8">
                  <dt className="font-semibold">Language</dt>
                  <dd>{stream.Language || "Unknown"}</dd>

                  <dt className="font-semibold">Codec</dt>
                  <dd>{stream.Codec}</dd>

                  <dt className="font-semibold">Channels</dt>
                  <dd>{stream.Channels}</dd>

                  <dt className="font-semibold">Bitrate</dt>
                  <dd>{Math.round(stream.BitRate! / 1000)} kbps</dd>
                </dl>
              </div>
            ))}
          </section>
        )}

        {subtitleStreams.length > 0 && (
          <section className="mb-6">
            <h3 className="font-semibold text-lg font-poppins mb-2">
              Subtitles
            </h3>
            {subtitleStreams.map((stream: MediaStream, index: number) => (
              <div key={index} className="mb-4 last:mb-0">
                <h4 className="font-medium text-base mb-2 pl-4">
                  Subtitle Stream {index + 1}
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pl-8">
                  <dt className="font-semibold">Language</dt>
                  <dd>{stream.Language || "Unknown"}</dd>

                  <dt className="font-semibold">Format</dt>
                  <dd>{stream.Codec}</dd>
                </dl>
              </div>
            ))}
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
