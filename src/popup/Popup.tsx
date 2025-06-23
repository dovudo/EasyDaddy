import React, { useEffect, useState, useRef } from 'react';
import {
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
  initStorage,
} from '../lib/storage';
import styles from './Popup.module.css';

// Type for profile data
type ProfileData = Record<string, any>;

const Popup: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [profileDataText, setProfileDataText] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        // Step 1: Initialize storage first
        await initStorage(); 

        // Step 2: Proceed with loading profiles
        setStatus('Loading profiles...');
        const profileList = (await listProfiles()).map((p) => p.id);
        setProfiles(profileList);

        const lastActiveId = await getActiveProfileId();
        const currentActive = lastActiveId && profileList.includes(lastActiveId)
          ? lastActiveId
          : profileList[0] || '';
        
        if (currentActive) {
          await handleSelectProfile(currentActive);
        } else {
          setStatus('No profiles found. Create one to start!');
          setProfileDataText('');
        }
      } catch (error) {
        console.error('Failed to load popup:', error);
        setStatus('Error: Could not initialize storage.');
      }
    }
    loadData();
  }, []);

  const handleSelectProfile = async (id: string) => {
    if (!id) {
      setActiveProfile('');
      setProfileDataText('');
      setStatus('Select a profile or create a new one.');
      return;
    }
    setActiveProfile(id);
    setStatus(`Loading profile: ${id}`);
    await setActiveProfileId(id);
    const data = await getProfile(id);
    setProfileDataText(JSON.stringify(data || {}, null, 2));
    setStatus(`Profile "${id}" loaded.`);
  };

  const handleCreateProfile = async () => {
    const id = prompt('Enter a name for the new profile:');
    if (!id || profiles.includes(id)) {
      if (id) alert(`Profile "${id}" already exists.`);
      return;
    }
    await saveProfile(id, {});
    setProfiles([...profiles, id]);
    await handleSelectProfile(id);
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile || !confirm(`Are you sure you want to delete profile "${activeProfile}"?`)) {
      return;
    }
    await deleteProfile(activeProfile);
    const remainingProfiles = profiles.filter((p) => p !== activeProfile);
    setProfiles(remainingProfiles);
    await handleSelectProfile(remainingProfiles[0] || '');
  };

  const handleTextChange = async (newText: string) => {
    setProfileDataText(newText);
    try {
      const obj = JSON.parse(newText);
      if (activeProfile) {
        await saveProfile(activeProfile, obj);
      }
    } catch (e) {
      // Ignore JSON parse errors while user is typing
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfile) return;

    setStatus(`Processing file: ${file.name}...`);
    try {
      let rawText = '';
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'pdf') {
        // Dynamically import pdfjs-dist
        const pdfjs = await import('pdfjs-dist/build/pdf');
        // Point to the local worker file made accessible via manifest.json
        pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf-worker.js');
        
        const fileData = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: fileData }).promise;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          rawText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      } else {
        rawText = await file.text();
      }

      setStatus('Extracting data with AI...');
      const structuredData = await chrome.runtime.sendMessage({
        type: 'extract_profile',
        text: rawText,
      });

      if (structuredData) {
        const currentProfile = await getProfile(activeProfile) || {};
        const mergedProfile = { ...currentProfile, ...structuredData };
        await saveProfile(activeProfile, mergedProfile);
        setProfileDataText(JSON.stringify(mergedProfile, null, 2));
        setStatus('Profile updated successfully!');
      } else {
        throw new Error('AI processing returned no data.');
      }
    } catch (error) {
      console.error('Failed to process file:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      // Reset file input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleFillForms = async () => {
    if (!activeProfile) {
      alert('Please select a profile first.');
      return;
    }
    
    setStatus('Getting profile data...');
    const profileData = await getProfile(activeProfile);
    if (!profileData) {
      alert('Could not load profile data.');
      setStatus('Error loading profile.');
      return;
    }

    setStatus('Scanning page and filling forms...');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'start_fill',
          profile: profileData, // Pass the actual profile data
        }, (response) => {
          if (chrome.runtime.lastError) {
            setStatus(`Error: ${chrome.runtime.lastError.message}`);
          } else if (response?.success) {
            setStatus('Forms filled successfully!');
          } else {
            setStatus('Failed to fill forms on the page.');
          }
        });
      } else {
        setStatus('Could not find active tab.');
      }
    });
  };


  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>EasyDaddy</h1>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <label className={styles.sectionTitle}>Profile Management</label>
          <div className={styles.profileActions}>
            <select
              value={activeProfile}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className={styles.profileSelector}
              disabled={!profiles.length}
            >
              <option value="" disabled>
                {profiles.length ? 'Select a profile' : 'No profiles'}
              </option>
              {profiles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button 
              onClick={handleCreateProfile} 
              className={`${styles.button} ${styles.buttonSecondary} ${styles.compact}`}
            >
              New
            </button>
            <button 
              onClick={handleDeleteProfile} 
              className={`${styles.button} ${styles.buttonDanger} ${styles.compact}`} 
              disabled={!activeProfile}
            >
              Delete
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <label htmlFor="profile-editor" className={styles.sectionTitle}>
            Profile Data
          </label>
          <textarea
            id="profile-editor"
            className={styles.profileEditor}
            value={profileDataText}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={!activeProfile}
            placeholder={activeProfile ? "Your profile data will appear here..." : status}
          />
          
          <input
            type="file"
            id="file-upload"
            ref={fileInputRef}
            className={styles.fileInput}
            onChange={handleFileChange}
            accept=".txt,.md,.pdf"
            disabled={!activeProfile}
          />
          <label 
            htmlFor="file-upload" 
            className={`${styles.fileInputLabel} ${!activeProfile ? styles.disabled : ''}`}
          >
            📄 Upload & Parse Document
          </label>
        </section>

        {status && (
          <div className={`${styles.status} ${
            status.includes('Error') ? styles.error : 
            status.includes('successfully') || status.includes('filled') ? styles.success :
            status.includes('...') ? styles.loading : ''
          }`}>
            {status}
          </div>
        )}
      </div>
      
      <footer className={styles.footer}>
        <button 
          onClick={handleFillForms} 
          className={`${styles.button} ${styles.buttonPrimary}`} 
          disabled={!activeProfile}
        >
          🚀 Fill Out Forms on Page
        </button>
      </footer>
    </div>
  );
};

export default Popup;
