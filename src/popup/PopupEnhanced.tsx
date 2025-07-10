import React, { useEffect, useState, useRef } from 'react';
import { ipc, MessageTypes, BrowserCapabilities } from '../shared/ipc';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
const logo = '/logo.png';
const loadingIcon = '/loading_icon.png';

// Profile types
interface ProfileData {
  [key: string]: any;
}

const PopupEnhanced: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [profileDataText, setProfileDataText] = useState('');
  const [showProfileData, setShowProfileData] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [sendOnce, setSendOnce] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [browserInfo, setBrowserInfo] = useState<BrowserCapabilities | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPopup, setIsPopup] = useState(true);
  const [isSafari, setIsSafari] = useState(false);
  const [sitesData, setSitesData] = useState<any[]>([]);
  const [showSitesData, setShowSitesData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Universal browser detection
  useEffect(() => {
    const capabilities = ipc.browserCapabilities;
    setBrowserInfo(capabilities);
    setIsSafari(capabilities.name === 'Safari');
    setIsPopup(window.location.protocol.startsWith('chrome-extension'));
    loadProfiles();
  }, []);

  // Load profiles via IPC
  const loadProfiles = async () => {
    setStatus('Loading profiles...');
    try {
      // For simplicity: get profile list via background
      const result = await ipc.sendMessage({ type: 'LIST_PROFILES' });
      setProfiles(result.profiles || []);
      const lastActive = result.activeProfileId || (result.profiles && result.profiles[0]) || '';
      if (lastActive) {
        await handleSelectProfile(lastActive);
      } else {
        setStatus('No profiles found. Create one to start!');
        setProfileDataText('');
      }
    } catch (error) {
      setStatus('Error loading profiles');
    }
  };

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
    try {
      const data = await ipc.sendMessage({ type: 'GET_PROFILE', payload: { id } });
      setProfileDataText(JSON.stringify(data || {}, null, 2));
      setSitesData(data?.sites || []);
      setStatus(`Profile "${id}" loaded.`);
    } catch (error) {
      setStatus('Error loading profile');
    }
  };

  const handleCreateProfile = async () => {
    const id = prompt('Enter a name for the new profile:');
    if (!id || profiles.includes(id)) {
      if (id) alert(`Profile "${id}" already exists.`);
      return;
    }
    await ipc.sendMessage({ type: 'SAVE_PROFILE', payload: { id, data: {} } });
    await loadProfiles();
    await handleSelectProfile(id);
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile || !confirm(`Are you sure you want to delete profile "${activeProfile}"?`)) {
      return;
    }
    await ipc.sendMessage({ type: 'DELETE_PROFILE', payload: { id: activeProfile } });
    await loadProfiles();
  };

  const handleTextChange = async (newText: string) => {
    setProfileDataText(newText);
    try {
      const obj = JSON.parse(newText);
      if (activeProfile) {
        await ipc.sendMessage({ type: 'SAVE_PROFILE', payload: { id: activeProfile, data: obj } });
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
        setStatus('PDF processing not supported in this browser. Use text files.');
        return;
      } else {
        rawText = await file.text();
      }
      setStatus('Extracting data with AI...');
      const structuredData = await ipc.sendMessage({
        type: MessageTypes.PROFILE_EXTRACT,
        payload: { text: rawText, fileName: file.name }
      });
      if (structuredData) {
        const currentProfile = JSON.parse(profileDataText || '{}') || {};
        const mergedProfile = { ...currentProfile, ...structuredData };
        await ipc.sendMessage({ type: 'SAVE_PROFILE', payload: { id: activeProfile, data: mergedProfile } });
        setProfileDataText(JSON.stringify(mergedProfile, null, 2));
        setStatus('Profile updated successfully!');
      } else {
        throw new Error('AI processing returned no data.');
      }
    } catch (error) {
      setStatus('Error processing file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFillForms = async () => {
    if (!activeProfile) {
      alert('Please select a profile first.');
      return;
    }
    setIsLoading(true);
    try {
      const profileData = JSON.parse(profileDataText || '{}');
      const response = await ipc.sendMessage({
        type: MessageTypes.FORM_FILL,
        payload: {
          profileId: activeProfile,
          profile: profileData,
          instructions
        }
      });
      if (response?.error) {
        alert('Error: ' + response.error);
      }
      if (sendOnce) {
        setInstructions('');
        setSendOnce(false);
      }
    } catch (error) {
      alert('Error during form filling');
    } finally {
      setIsLoading(false);
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
                Running on {browserInfo.name} {browserInfo.version} ({browserInfo.platform})
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
              <div className="mb-2">Extension opened in tab mode (Arc, Safari iOS).<br/>This is normal - all functions are available!</div>
              <div className="text-xs text-gray-500">Mode: {isPopup ? 'Popup' : 'Tab'} | URL: {window.location.protocol}</div>
            </div>
          )}

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
                <Button onClick={handleCreateProfile} variant="secondary" className="button buttonSecondary buttonCompact">New</Button>
                <Button onClick={handleDeleteProfile} variant="destructive" className="button buttonDanger buttonCompact" disabled={!activeProfile}>Delete</Button>
              </div>
            </section>

            <section className="section mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="profile-editor" className="sectionTitle">Profile Data</Label>
                <Button variant="secondary" size="sm" onClick={() => setShowProfileData(!showProfileData)} disabled={!activeProfile}>
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
                  placeholder={activeProfile ? 'Your profile data will appear here...' : status}
                />
              )}
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                className="fileInput mb-2"
                onChange={handleFileChange}
                accept=".txt,.md"
                disabled={!activeProfile}
              />
              <Label htmlFor="file-upload" className={`${!activeProfile ? 'disabled' : ''} fileInputLabel block cursor-pointer`}>
                📄 Upload & Parse Document
              </Label>
            </section>

            <section className="section mb-4">
              <Label htmlFor="instructions" className="sectionTitle block mb-2">Additional Instructions</Label>
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
                <Label className="sectionTitle">Saved Site Data ({sitesData.length})</Label>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowSitesData(!showSitesData)} disabled={!activeProfile || sitesData.length === 0}>
                    {showSitesData ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
              {showSitesData && sitesData.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sitesData.map((site, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border text-sm">
                      <div className="font-medium text-blue-600 mb-1">{site.domain}</div>
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
                status.includes('Error') ? 'error' :
                status.includes('successfully') ? 'success' :
                status.includes('...') ? 'loading' : ''
              }`}>
                {status}
              </div>
            )}

            {browserInfo?.name === 'Arc' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4 text-sm">
                <strong>Arc Browser Tips:</strong>
                <ul className="mt-1 ml-4 list-disc text-xs">
                                      <li>If buttons don't work, try reloading the tab</li>
                                      <li>Make sure extension has all necessary permissions</li>
                </ul>
              </div>
            )}
          </div>
          <footer className="footer mt-4 flex justify-center">
            <Button onClick={handleFillForms} className="button buttonPrimary w-full" disabled={!activeProfile || isLoading}>
              {isLoading ? (
                <img src={loadingIcon} alt="Loading..." style={{ height: 24, marginRight: 8 }} />
              ) : '🚀'} Fill Out Forms on Page
            </Button>
          </footer>
          {isSafari && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mt-4 text-sm">
              <strong>Safari/WebKit Notice:</strong>
              <ul className="mt-1 ml-4 list-disc text-xs">
                <li>Some functions may be limited due to Safari security policies (CSP, background scripts, PDF-parsing).</li>
                                  <li>If something doesn't work - check Safari console for errors.</li>
                  <li>For stable operation use the latest Safari/WebExtensions API version.</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PopupEnhanced; 