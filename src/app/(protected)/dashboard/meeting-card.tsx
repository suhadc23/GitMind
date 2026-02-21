'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadFile } from '@/lib/firebase'
import { api } from '@/trpc/react'
import { useProject } from '@/hooks/use-project'
import { toast } from 'sonner'
import { Presentation, Upload, Loader2, CheckCircle } from 'lucide-react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import axios from 'axios'

export function MeetingCard() {
  const { project } = useProject()
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const uploadMeeting = api.project.uploadMeeting.useMutation()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file || !project?.id) return

      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        toast.error('Firebase not configured. Please add Firebase environment variables.')
        return
      }

      setIsUploading(true)
      setProgress(0)
      setUploadSuccess(false)

      try {
        const downloadUrl = await uploadFile(file, setProgress)

        const meeting = await uploadMeeting.mutateAsync({
          meetingUrl: downloadUrl,
          projectId: project.id,
          name: file.name,
        })

        // Trigger background processing
        await axios.post('/api/process-meeting', {
          meetingId: meeting.id,
          meetingUrl: downloadUrl,
        })

        setUploadSuccess(true)
        toast.success('Meeting uploaded! Processing will complete shortly.')
      } catch (error) {
        console.error(error)
        toast.error('Failed to upload meeting.')
        setUploadSuccess(false)
      } finally {
        setIsUploading(false)
        setProgress(0)
      }
    },
    [project?.id, uploadMeeting]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'], 'video/*': ['.mp4', '.webm'] },
    multiple: false,
    disabled: isUploading || !project?.id,
  })

  if (!project) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Presentation className="h-5 w-5 text-orange-500" />
            Upload Meeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a project to upload meetings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Presentation className="h-5 w-5 text-orange-500" />
          Upload Meeting
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isUploading ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16">
              <CircularProgressbar
                value={progress}
                text={`${progress}%`}
                styles={buildStyles({
                  pathColor: '#10b981',
                  textColor: '#10b981',
                  trailColor: '#d1fae5',
                })}
              />
            </div>
            <p className="text-sm text-muted-foreground">Uploading audio...</p>
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center gap-2 py-4 text-emerald-600">
            <CheckCircle className="h-10 w-10" />
            <p className="text-sm font-medium">Upload complete!</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadSuccess(false)}
              className="text-xs"
            >
              Upload another
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-primary hover:bg-primary/5'
            } ${!project?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? 'Drop the audio/video here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A, MP4 supported</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
