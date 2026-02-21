<div
  class="relative h-8 w-full flex items-center justify-center px-4
  hazard-bg hazard-move"
>
  <div class="absolute inset-0 bg-black/50"></div>
  <p class="relative z-10 text-white font-semibold tracking-wide">
    Work in progress. May be very unstable.
  </p>
</div>


<style>
  .hazard-bg {
    background-image: repeating-linear-gradient(
      45deg,
      #facc15 0 20px,
      #000 20px 40px
    );
    background-size: 56px 56px;
    background-repeat: repeat;
  }

  @keyframes hazard {
    from {
      background-position: 0 0;
    }
    to {
      background-position: 56px 0;
    }
  }

  .hazard-move {
    animation: hazard 5s linear infinite;
    will-change: background-position;
  }
</style>