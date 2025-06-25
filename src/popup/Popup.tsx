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
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';

// Type for profile data
type ProfileData = Record<string, any>;

const Popup: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [profileDataText, setProfileDataText] = useState('');
  const [showProfileData, setShowProfileData] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [sendOnce, setSendOnce] = useState(false);
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
    const profileData = await getProfile(activeProfile);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            type: 'start_fill',
            profileId: activeProfile,
            profile: profileData,
            instructions,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              const msg = chrome.runtime.lastError.message || '';
              if (msg.includes('Could not establish connection')) {
                alert('Не удалось подключиться к странице. Пожалуйста, перезагрузите вкладку и попробуйте снова.');
              } else {
                alert('Произошла ошибка: ' + msg + '\nПопробуйте перезагрузить страницу и повторить попытку.');
              }
            }
            // Можно обработать response, если нужно
          }
        );
      }
    });

    if (sendOnce) {
      setInstructions('');
      setSendOnce(false);
    }
  };


  return (
    <div className="wrapper">
      <Card className="bg-[#f9f9f9] border border-solid border-[#d9cfcf] w-[500px] mx-auto mt-4">
        <CardContent>
          <header className="header">
            <h1 className="title text-center text-2xl font-bold mb-4">EasyDaddy</h1>
          </header>

          <div className="content">
            <section className="section mb-4">
              <Label className="sectionTitle block mb-2">Profile Management</Label>
              <div className="profileActions flex gap-2 mb-2">
                <select
                  value={activeProfile}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="profileSelector border rounded px-2 py-1"
                  disabled={!profiles.length}
                >
                  <option value="" disabled>
                    {profiles.length ? 'Select a profile' : 'No profiles'}
                  </option>
                  {profiles.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <Button 
                  onClick={handleCreateProfile} 
                  variant="secondary"
                  className="button buttonSecondary buttonCompact"
                >
                  New
                </Button>
                <Button 
                  onClick={handleDeleteProfile} 
                  variant="destructive"
                  className="button buttonDanger buttonCompact" 
                  disabled={!activeProfile}
                >
                  Delete
                </Button>
              </div>
            </section>

            <section className="section mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="profile-editor" className="sectionTitle">
                  Profile Data
                </Label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowProfileData(!showProfileData)}
                  disabled={!activeProfile}
                >
                  {showProfileData ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showProfileData && (
                <textarea
                  id="profile-editor"
                  className="profileEditor w-full mb-2"
                  value={profileDataText}
                  onChange={(e: any) => handleTextChange(e.target.value)}
                  disabled={!activeProfile}
                  placeholder={
                    activeProfile
                      ? 'Your profile data will appear here...'
                      : status
                  }
                />
              )}
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                className="fileInput mb-2"
                onChange={handleFileChange}
                accept=".txt,.md,.pdf"
                disabled={!activeProfile}
              />
              <Label
                htmlFor="file-upload"
                className={`${!activeProfile ? 'disabled' : ''} fileInputLabel block cursor-pointer`}
              >
                📄 Upload & Parse Document
              </Label>
            </section>

            <section className="section mb-4">
              <Label htmlFor="instructions" className="sectionTitle block mb-2">
                Additional Instructions
              </Label>
              <textarea
                id="instructions"
                className="profileEditor w-full mb-2"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add any temporary instructions for this fill session..."
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-once"
                  checked={sendOnce}
                  onCheckedChange={(v) => setSendOnce(!!v)}
                />
                <Label htmlFor="send-once">Send once</Label>
              </div>
            </section>

            {status && (
              <div className={`status ${
                status.includes('Error') ? 'error' : 
                status.includes('successfully') || status.includes('filled') ? 'success' :
                status.includes('...') ? 'loading' : ''
              }`}>
                {status}
              </div>
            )}
          </div>
          <footer className="footer mt-4 flex justify-center">
            <Button 
              onClick={handleFillForms} 
              className="button buttonPrimary w-full" 
              disabled={!activeProfile}
            >
              🚀 Fill Out Forms on Page
            </Button>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Popup;
