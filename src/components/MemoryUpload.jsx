import React, { useState, useRef } from 'react'
import { Upload, Image, FileText, Loader, Check, AlertCircle } from 'lucide-react'
import { uploadMemoryImage, createMemory, createGratitudeEntries } from '../lib/supabase'
import { extractGratitudeEntries } from '../lib/ai-extraction'

function MemoryUpload({ userId }) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [metadata, setMetadata] = useState({
    source_type: 'card',
    sender_name: '',
    occasion: '',
    date_received: ''
  })
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  const fileInputRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileSelect(file)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  function handleFileSelect(file) {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
    setSuccess(false)
  }

  function handleMetadataChange(field, value) {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!extractedText.trim()) {
      setError('Please enter the text from the card or letter.')
      return
    }

    try {
      setProcessing(true)
      setError(null)

      // Step 1: Upload image if present
      let imageUrl = null
      if (selectedFile) {
        setProcessingStep('Uploading image...')
        try {
          imageUrl = await uploadMemoryImage(selectedFile, userId)
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing without image:', uploadErr)
        }
      }

      // Step 2: Create memory record
      setProcessingStep('Saving memory...')
      const memory = await createMemory(userId, {
        original_image_url: imageUrl,
        extracted_text: extractedText,
        source_type: metadata.source_type,
        sender_name: metadata.sender_name || null,
        occasion: metadata.occasion || null,
        date_received: metadata.date_received || null,
        is_processed: false
      })

      // Step 3: Extract gratitude entries using AI
      setProcessingStep('Extracting gratitude themes...')
      const entries = await extractGratitudeEntries(extractedText, {
        sender: metadata.sender_name,
        occasion: metadata.occasion,
        date_received: metadata.date_received
      })

      // Step 4: Save gratitude entries
      setProcessingStep('Creating gratitude seeds...')
      await createGratitudeEntries(userId, memory.id, entries)

      // Success!
      setSuccess(true)
      setProcessingStep('')
      
      // Reset form after delay
      setTimeout(() => {
        resetForm()
      }, 3000)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProcessing(false)
      setProcessingStep('')
    }
  }

  function resetForm() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setExtractedText('')
    setMetadata({
      source_type: 'card',
      sender_name: '',
      occasion: '',
      date_received: ''
    })
    setSuccess(false)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (success) {
    return (
      <div className="upload-section">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Check size={48} color="var(--sage-green)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--deep-burgundy)', marginBottom: '0.5rem' }}>
            Memory planted!
          </h2>
          <p style={{ color: 'var(--warm-gray)' }}>
            Your gratitude seeds have been extracted and will bloom in your daily reflections.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={resetForm}
            style={{ marginTop: '1.5rem' }}
          >
            Add another memory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="upload-section">
      <h2 className="upload-title">Plant a Memory</h2>
      <p className="upload-subtitle">
        Upload a scanned card or letter, and we'll extract gratitude themes for your daily reflections.
      </p>

      {/* Image Upload Area */}
      <div
        className={`upload-dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        
        {previewUrl ? (
          <div style={{ textAlign: 'center' }}>
            {selectedFile.type === 'application/pdf' ? (
              <div style={{ marginBottom: '1rem' }}>
                <FileText size={48} style={{ color: 'var(--soft-gold)' }} />
                <p style={{ color: 'var(--sage-green)', marginTop: '0.5rem' }}>
                  <Check size={16} style={{ marginRight: '0.5rem' }} />
                  {selectedFile.name}
                </p>
              </div>
            ) : (
              <>
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }} 
                />
                <p style={{ color: 'var(--sage-green)' }}>
                  <Check size={16} style={{ marginRight: '0.5rem' }} />
                  {selectedFile.name}
                </p>
              </>
            )}
            <span>Click to change file</span>
          </div>
        ) : (
          <>
            <Image className="upload-icon" size={48} />
            <p>Drop your scanned image or PDF here, or click to browse</p>
            <span>Supports JPG, PNG, PDF, and other image formats</span>
          </>
        )}
      </div>

      {/* Form Fields */}
      <form className="upload-form card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            <FileText size={16} style={{ marginRight: '0.5rem' }} />
            Text from the card or letter *
          </label>
          <textarea
            className="form-textarea"
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            placeholder="Type or paste the text from your scanned memory here..."
            rows={6}
            required
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--warm-gray)' }}>
            You can type this manually or use OCR software on your scan
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Type of memory</label>
          <select
            className="form-select"
            value={metadata.source_type}
            onChange={(e) => handleMetadataChange('source_type', e.target.value)}
          >
            <option value="card">Greeting Card</option>
            <option value="letter">Letter</option>
            <option value="note">Note</option>
            <option value="email">Printed Email</option>
            <option value="photo">Photo with writing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Who sent this? (optional)</label>
          <input
            type="text"
            className="form-input"
            value={metadata.sender_name}
            onChange={(e) => handleMetadataChange('sender_name', e.target.value)}
            placeholder="e.g., Mom, Uncle Bob, College friend"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Occasion (optional)</label>
          <input
            type="text"
            className="form-input"
            value={metadata.occasion}
            onChange={(e) => handleMetadataChange('occasion', e.target.value)}
            placeholder="e.g., Birthday, Christmas, Just because"
          />
        </div>

        <div className="form-group">
          <label className="form-label">When did you receive it? (optional)</label>
          <input
            type="date"
            className="form-input"
            value={metadata.date_received}
            onChange={(e) => handleMetadataChange('date_received', e.target.value)}
          />
        </div>

        {error && (
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(122, 62, 72, 0.1)', 
            borderRadius: '8px',
            color: 'var(--deep-burgundy)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {processing && (
          <div className="processing-status">
            <Loader className="processing-spinner" size={18} />
            <span>{processingStep}</span>
          </div>
        )}

        <div className="reflection-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Extract Gratitude Seeds'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={resetForm}
            disabled={processing}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  )
}

export default MemoryUpload
