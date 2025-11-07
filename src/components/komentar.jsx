import { useEffect } from 'react';

const Komentar = () => {
  useEffect(() => {
    // Inisialisasi CommentBox.io
    if (typeof window.commentbox === "function") {
      window.commentbox("5660104556806144-proj", window.location.href);
    }
  }, []);

  return (
    <div id="commentbox" className="container max-h-[600px] overflow-y-auto flex flex-col gap-3 rounded-md p-2 bg-[#212121] text-white">
      {/* Komentar akan ditampilkan di sini */}
    </div>
  );
};

export default Komentar;
