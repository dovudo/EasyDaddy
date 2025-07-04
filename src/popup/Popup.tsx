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
import { browserAPI, handleBrowserError, getBrowserCapabilities, isSafariBrowser } from '../lib/browser-compat';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { makeBus } from '@davestewart/extension-bus';
import type { ProfileSiteData } from '../lib/types';
const logo = '/logo.png';
const loadingIcon = '/loading_icon.png';

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
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPopup, setIsPopup] = useState(true);
  const [isSafari, setIsSafari] = useState(false);
  const [sitesData, setSitesData] = useState<ProfileSiteData[]>([]);
  const [showSitesData, setShowSitesData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create Extension Bus for popup
  const bus = makeBus('popup', {
    target: 'background',
    handlers: {
      ping() {
        return { status: 'popup alive' };
      }
    }
  });

  // Initial load
  useEffect(() => {
    // Detect if running as extension popup or as a tab
    // In popup: window.location.protocol === 'chrome-extension:'
    // In tab: window.location.protocol === 'http:' or 'https:'
    const isRealPopup = window.location.protocol.startsWith('chrome-extension');
    setIsPopup(isRealPopup);
    
    // Load data regardless of popup vs tab mode (Arc, Safari iOS support)
    async function loadData() {
      try {
        // Log browser detection
        const capabilities = getBrowserCapabilities();
        console.log(`[EasyDaddy] Running on ${capabilities.name} ${capabilities.version}`);
        setBrowserInfo(capabilities);
        
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
        setStatus(handleBrowserError(error, 'popup initialization'));
      }
    }
    loadData();

    setIsSafari(isSafariBrowser());
    if (isSafariBrowser()) {
      console.log('[EasyDaddy] Safari/WebKit mode detected');
    }
  }, []);

  const handleSelectProfile = async (id: string) => {
    if (!id) {
      setActiveProfile('');
      setProfileDataText('');
      setSitesData([]);
      setStatus('Select a profile or create a new one.');
      return;
    }
    setActiveProfile(id);
    setStatus(`Loading profile: ${id}`);
    await setActiveProfileId(id);
    const data = await getProfile(id);
    setProfileDataText(JSON.stringify(data || {}, null, 2));
    
    // Load sites data
    const sites = data?.sites || [];
    setSitesData(sites);
    
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
        // Check if browser supports PDF processing
        const capabilities = getBrowserCapabilities();
        if (!capabilities.supportsPDF) {
          throw new Error(`PDF processing не поддерживается в ${capabilities.name}. Используйте текстовые файлы.`);
        }
        
        // Dynamically import pdfjs-dist
        const pdfjs = await import('pdfjs-dist/build/pdf');
        // Point to the local worker file made accessible via manifest.json
        pdfjs.GlobalWorkerOptions.workerSrc = browserAPI.runtime.getURL('pdf-worker.js');
        
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
      const structuredData = await browserAPI.runtime.sendMessage({
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
      setStatus(handleBrowserError(error, 'file processing'));
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
    setIsLoading(true);
    try {
      const profileData = await getProfile(activeProfile);
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const response = await browserAPI.tabs.sendMessage(
          activeTab.id,
          {
            type: 'start_fill',
            profileId: activeProfile,
            profile: profileData,
            instructions,
          }
        );
        if (response?.noConnection) {
          alert(handleBrowserError(new Error(response.error), 'tab communication'));
        }
      } else {
        alert('Не удалось найти активную вкладку. Убедитесь, что вкладка открыта и активна.');
      }
      if (sendOnce) {
        setInstructions('');
        setSendOnce(false);
      }
    } catch (error) {
      alert(handleBrowserError(error, 'form filling'));
    } finally {
      setIsLoading(false);
    }
  };

  // Test Extension Bus connection
  const testBusConnection = async () => {
    try {
      const result = await bus.call('ping');
      console.log('[EasyDaddy Popup] Bus connection test:', result);
      setStatus(`Bus connected: ${result?.status || 'OK'}`);
    } catch (error) {
      console.error('[EasyDaddy Popup] Bus connection error:', error);
      setStatus('Bus connection failed');
    }
  };

  return (
    <div className="wrapper">
      <Card className="bg-[#f9f9f9] border border-solid border-[#d9cfcf] mx-auto mt-4">
        <CardContent>
          <header className="header">
            <img src={logo} alt="EasyDaddy Logo" style={{ height: 48, margin: '0 auto 8px', display: 'block' }} />
            <h1 className="title text-center text-2xl font-bold mb-2">EasyDaddy</h1>
            {browserInfo && (
              <div className="text-center text-sm text-gray-600 mb-4">
                Running on {browserInfo.name} {browserInfo.version}
                {browserInfo.name === 'Arc' && (
                  <div className="text-xs text-blue-600 mt-1">
                    Arc browser detected - enhanced compatibility mode
                  </div>
                )}
                {isSafari && (
                  <div className="text-xs text-green-700 mt-1">
                    Safari/WebKit detected - compatibility mode
                  </div>
                )}
              </div>
            )}
          </header>

          {!isPopup && (
            <div className="bg-blue-50 border border-blue-300 rounded p-4 text-center mb-4">
              <div className="text-lg font-bold mb-2">📱 Tab Mode</div>
              <div className="mb-2">Расширение открыто в режиме вкладки (Arc, Safari iOS).<br/>Это нормально - все функции доступны!</div>
              <div className="text-xs text-gray-500">Mode: {isPopup ? 'Popup' : 'Tab'} | URL: {window.location.protocol}</div>
            </div>
          )}
          
                     {/* Main UI - now works in both popup and tab modes */}
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
                <div className="checkbox-row">
                  <Checkbox
                    id="send-once"
                    checked={sendOnce}
                    onCheckedChange={(v) => setSendOnce(v === true)}
                    className="radix-checkbox"
                  />
                  <Label htmlFor="send-once">Use once and delete</Label>
                </div>
              </section>

              <section className="section mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="sectionTitle">
                    Saved Site Data ({sitesData.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowSitesData(!showSitesData)}
                      disabled={!activeProfile || sitesData.length === 0}
                    >
                      {showSitesData ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={testBusConnection}
                      title="Test Extension Bus connection"
                    >
                      🔌
                    </Button>
                  </div>
                </div>
                
                {showSitesData && sitesData.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sitesData.map((site, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border text-sm">
                        <div className="font-medium text-blue-600 mb-1">
                          {site.domain}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          Last used: {site.lastUsed ? new Date(site.lastUsed).toLocaleDateString() : 'Never'} 
                          {site.useCount ? ` (${site.useCount} times)` : ''}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {Object.entries(site.fields).slice(0, 6).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="text-gray-600">{key}:</span> 
                              <span className="ml-1 font-mono">{String(value).substring(0, 20)}...</span>
                            </div>
                          ))}
                          {Object.keys(site.fields).length > 6 && (
                            <div className="text-gray-400 col-span-2">
                              +{Object.keys(site.fields).length - 6} more fields...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showSitesData && sitesData.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No site data saved yet. Fill out forms on websites to automatically save data to your profile.
                  </div>
                )}
              </section>

              {status && (
                <div className={`status ${
                  status.includes('Error') || status.includes('ошибка') ? 'error' : 
                  status.includes('successfully') || status.includes('filled') || status.includes('успешно') ? 'success' :
                  status.includes('...') ? 'loading' : ''
                }`}>
                  {status}
                </div>
              )}
              
              {browserInfo?.name === 'Arc' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4 text-sm">
                  <strong>Arc Browser Tips:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    <li>Если кнопки не работают, попробуйте перезагрузить вкладку</li>
                    <li>Убедитесь, что расширение имеет все необходимые разрешения</li>
                    <li>PDF обработка может быть ограничена в Arc</li>
                  </ul>
                </div>
              )}
            </div>
          <footer className="footer mt-4 flex justify-center">
            <Button 
              onClick={handleFillForms} 
              className="button buttonPrimary w-full" 
              disabled={!activeProfile || isLoading}
            >
              {isLoading ? (
                <img src={loadingIcon} alt="Loading..." style={{ height: 24, marginRight: 8 }} />
              ) : '🚀'} Fill Out Forms on Page
            </Button>
          </footer>

          {isSafari && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mt-4 text-sm">
              <strong>Safari/WebKit Notice:</strong>
              <ul className="mt-1 ml-4 list-disc text-xs">
                <li>Некоторые функции могут быть ограничены из-за политики безопасности Safari (CSP, background scripts, PDF-parsing).</li>
                <li>Если что-то не работает — проверьте консоль Safari на ошибки.</li>
                <li>Для стабильной работы используйте последнюю версию Safari/WebExtensions API.</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Popup;
